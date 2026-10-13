import {NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(){
  const databaseUrl=process.env.DATABASE_URL;
  if(!databaseUrl) return NextResponse.json({schemaVersion:1,lastReviewed:null,source:"not-configured",offerings:[]},{headers:{"Cache-Control":"no-store"}});
  try{
    const sql=neon(databaseUrl);
    const rows=await sql`SELECT id, course_id AS "courseId", admission_year AS year, institution, title, city, mode, status, source_url AS "sourceUrl", to_char(source_date,'YYYY-MM-DD') AS "sourceDate", CASE WHEN application_deadline IS NULL THEN NULL ELSE to_char(application_deadline,'YYYY-MM-DD') END AS "applicationDeadline" FROM public.uniradar_offerings WHERE admission_year BETWEEN 2020 AND 2100 ORDER BY admission_year DESC, title LIMIT 5000`;
    const catalog=await sql`SELECT id,title,institution,city,category,level,description,source_url AS "url",to_char(verified_on,'YYYY-MM-DD') AS "verifiedOn" FROM public.uniradar_courses ORDER BY title LIMIT 5000`;
    return NextResponse.json({schemaVersion:1,lastReviewed:new Date().toISOString().slice(0,10),source:"neon",courses:catalog,offerings:rows},{headers:{"Cache-Control":"no-store"}});
  }catch(e){console.error("UniRadar Neon catalogue read failed",e instanceof Error?e.message:"unknown");return NextResponse.json({error:"Képzésadatok átmenetileg nem érhetők el"},{status:503,headers:{"Cache-Control":"no-store"}})}
}
