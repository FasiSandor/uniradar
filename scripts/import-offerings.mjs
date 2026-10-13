#!/usr/bin/env node
/**
 * UniRadar reviewed-offering importer.
 * Usage:
 *   node scripts/import-offerings.mjs reviewed-offerings.json
 *   DATABASE_URL=... node scripts/import-offerings.mjs reviewed-offerings.json --apply
 *
 * JSON input: { "reviewedBy": "editor", "reviewedAt": "2026-10-13",
 * "offerings": [{ "id":"institution-program-2027", "courseId":"institution-program",
 *   "year":2027, "institution":"...", "title":"...", "city":"...",
 *   "category":"Egyetemi", "mode":"Nappali", "status":"announced",
 *   "sourceUrl":"https://...", "sourceDate":"2026-12-15",
 *   "applicationDeadline":"2027-02-15" }] }
 *
 * NO scraping, guessing eligibility, or publishing unreviewed data.
 * Default is DRY RUN. Existing records are never deleted.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const args=process.argv.slice(2);
const filepath=args.find(a=>!a.startsWith('--'));
const apply=args.includes('--apply');
if(args.includes('--approve-updates')&&!apply)throw Error('--approve-updates requires --apply');
if(!filepath){console.error('Usage: node scripts/import-offerings.mjs reviewed-offerings.json [--apply]');process.exit(2);}
const data=JSON.parse(readFileSync(resolve(filepath),'utf8'));
const allowedCategories=new Set(['Egyetemi','Doktori','Felnőttképzés']);
const allowedStatuses=new Set(['announced','closed','cancelled']);
const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().startsWith(s);
const nonempty=s=>typeof s==='string'&&s.trim().length>0&&s.trim().length<=500;
if(!nonempty(data.reviewedBy)||!iso(data.reviewedAt)||!Array.isArray(data.offerings))throw Error('Missing reviewedBy, reviewedAt or offerings');
if(data.offerings.length>1000)throw Error('Maximum 1000 records per import');
const seen=new Set();
const normalized=data.offerings.map((o,i)=>{
  if(!o||typeof o!=='object')throw Error('Invalid record '+i);
  for(const field of ['id','courseId','institution','title','city','mode'])if(!nonempty(o[field]))throw Error('Missing '+field+' at record '+i);
  if(!/^[a-z0-9][a-z0-9_-]{2,119}$/.test(o.id)||!/^[a-z0-9][a-z0-9_-]{2,119}$/.test(o.courseId))throw Error('Invalid ID at '+i);
  if(seen.has(o.id))throw Error('Duplicate ID '+o.id);seen.add(o.id);
  if(!Number.isInteger(o.year)||o.year<2020||o.year>2100)throw Error('Invalid admission year at '+i);
  if(!allowedCategories.has(o.category)||!allowedStatuses.has(o.status))throw Error('Invalid category/status at '+i);
  if(!iso(o.sourceDate)||!iso(data.reviewedAt)||o.sourceDate>data.reviewedAt)throw Error('Invalid future or unverified sourceDate at '+i);
  if(o.applicationDeadline!=null&&!iso(o.applicationDeadline))throw Error('Invalid deadline at '+i);
  const url=new URL(o.sourceUrl);
  if(url.protocol!=='https:'||url.username||url.password||!url.hostname.includes('.'))throw Error('Only public HTTPS primary sources permitted at '+i);
  // Reject redirects and link shorteners when reviewing source documents.
  if(['bit.ly','tinyurl.com','t.co','goo.gl'].includes(url.hostname))throw Error('Shortened source link at '+i);
  return {id:o.id,courseId:o.courseId,year:o.year,institution:o.institution.trim(),title:o.title.trim(),city:o.city.trim(),mode:o.mode.trim(),category:o.category,status:o.status,sourceUrl:url.href,sourceDate:o.sourceDate,applicationDeadline:o.applicationDeadline??null};
});
console.log(JSON.stringify({mode:apply?'APPLY':'DRY_RUN',reviewedBy:data.reviewedBy,reviewedAt:data.reviewedAt,records:normalized.length,years:[...new Set(normalized.map(o=>o.year))]},null,2));
if(!apply){console.log('No database writes. Use --apply only after reviewing official source URLs.');process.exit(0);}
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required for --apply; never put the credential in Git.');
const {neon}=await import('@neondatabase/serverless');
const sql=neon(process.env.DATABASE_URL);
// Preview changes against the live database before writing.
const existing=await sql`SELECT id,course_id AS "courseId",admission_year AS year,institution,title,city,mode,category,status,source_url AS "sourceUrl",to_char(source_date,'YYYY-MM-DD') AS "sourceDate",CASE WHEN application_deadline IS NULL THEN NULL ELSE to_char(application_deadline,'YYYY-MM-DD') END AS "applicationDeadline" FROM public.uniradar_offerings`;
const existingById=new Map(existing.map(x=>[x.id,x]));
const fields=['courseId','year','institution','title','city','mode','category','status','sourceUrl','sourceDate','applicationDeadline'];
const actions=normalized.map(o=>{
  const previous=existingById.get(o.id);
  const changed=previous?fields.filter(k=>String(previous[k]??'')!==String(o[k]??'')):[];
  return {id:o.id,action:!previous?'create':changed.length?'update':'unchanged',changed,previous};
});
console.log('Import preview:',JSON.stringify(actions.map(({id,action,changed})=>({id,action,changed})),null,2));
const rewrites=actions.filter(x=>x.action==='update');
if(rewrites.length&&!args.includes('--approve-updates'))throw Error('Existing official entries would change. Review preview and add --approve-updates.');
const nowIso=new Date().toISOString().slice(0,10);
if(data.reviewedAt>nowIso)throw Error('Review date cannot be in the future');
let updated=0;
for(const o of normalized){
  const change=actions.find(a=>a.id===o.id);
  if(change.action==='unchanged')continue;
  // Stale source material must never replace a more recently verified record.
  if(change.previous && o.sourceDate<change.previous.sourceDate)throw Error('Older source cannot overwrite '+o.id);
  await sql`INSERT INTO public.uniradar_offerings
    (id,course_id,admission_year,institution,title,city,mode,category,status,source_url,source_date,application_deadline,updated_at)
    VALUES (${o.id},${o.courseId},${o.year},${o.institution},${o.title},${o.city},${o.mode},${o.category},${o.status},${o.sourceUrl},${o.sourceDate}::date,${o.applicationDeadline}::date,now())
    ON CONFLICT (id) DO UPDATE SET
    course_id=excluded.course_id, admission_year=excluded.admission_year,
    institution=excluded.institution,title=excluded.title,city=excluded.city,
    mode=excluded.mode,category=excluded.category,status=excluded.status,
    source_url=excluded.source_url,source_date=excluded.source_date,
    application_deadline=excluded.application_deadline,updated_at=now()`;
  // Audit preserves the previous record and reviewed source for later examination.
  await sql`INSERT INTO public.uniradar_import_audit (offering_id,reviewed_by,reviewed_at,before_data,after_data,source_url)
    VALUES (${o.id},${data.reviewedBy},${data.reviewedAt}::date,${JSON.stringify(change.previous??null)}::jsonb,${JSON.stringify(o)}::jsonb,${o.sourceUrl})`;
  updated++;
}
console.log('Reviewed Neon records written: '+updated);
