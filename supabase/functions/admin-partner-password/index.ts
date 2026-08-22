import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL")!;
    const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth=req.headers.get("Authorization")||"";
    if(!auth.startsWith("Bearer "))return json({error:"Требуется вход администратора."},401);

    const caller=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:{user},error:userError}=await caller.auth.getUser();
    if(userError||!user)return json({error:"Сессия администратора недействительна."},401);

    const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
    const {data:profile,error:profileError}=await admin.from("profiles").select("id,role").eq("id",user.id).maybeSingle();
    if(profileError||profile?.role!=="admin")return json({error:"Недостаточно прав."},403);

    const body=await req.json().catch(()=>({}));
    const restaurantId=String(body?.restaurantId||"").trim();
    const email=String(body?.email||"").trim().toLowerCase();
    const password=String(body?.password||"");
    if(!restaurantId||!email)return json({error:"Не указан партнёр или email."},400);
    if(password.length<6)return json({error:"Пароль должен содержать минимум 6 символов."},400);

    const {data:restaurant,error:restaurantError}=await admin.from("restaurants").select("id,name,email,active").eq("id",restaurantId).maybeSingle();
    if(restaurantError||!restaurant)return json({error:"Партнёр не найден."},404);
    const restaurantEmail=String(restaurant.email||"").trim().toLowerCase();
    if(restaurantEmail&&restaurantEmail!==email)return json({error:"Email не совпадает с карточкой партнёра."},409);

    let authUser:any=null;
    let page=1;
    while(page<=20&&!authUser){
      const {data,error}=await admin.auth.admin.listUsers({page,perPage:100});
      if(error)throw error;
      authUser=data.users.find(u=>String(u.email||"").toLowerCase()===email)||null;
      if(data.users.length<100)break;
      page++;
    }
    let action="updated";
    if(authUser){
      const {data,error}=await admin.auth.admin.updateUserById(authUser.id,{password,email_confirm:true,user_metadata:{...(authUser.user_metadata||{}),restaurant_id:restaurantId}});
      if(error)throw error;authUser=data.user;
    }else{
      const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{restaurant_id:restaurantId}});
      if(error)throw error;authUser=data.user;action="created";
    }
    if(!authUser?.id)throw new Error("Не удалось получить пользователя партнёра.");

    const {error:upsertError}=await admin.from("profiles").upsert({id:authUser.id,role:"restaurant",restaurant_id:restaurantId,display_name:restaurant.name||email},{onConflict:"id"});
    if(upsertError)throw upsertError;
    return json({ok:true,action,userId:authUser.id,restaurantId});
  }catch(error){
    console.error(error);
    return json({error:error instanceof Error?error.message:String(error)},500);
  }
});
