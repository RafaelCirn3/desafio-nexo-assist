export type Role = "EMPLOYEE" | "ANALYST_N1" | "ANALYST_N2";
export type User = { id: string; name: string; email: string; role: Role };
export type LoginResponse = { accessToken: string; tokenType: "Bearer"; expiresIn: number; user: User };
export type Ticket = {
 id:string; reference:string; title:string; description:string; status:string;
 type:"INC"|"REQ"; category:string; priority:string; dueAt:string|null; overdue:boolean; lastUpdatedAt:string;
};
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
export class ApiError extends Error { constructor(public readonly status:number, message:string){super(message);} }
async function request<T>(path:string, options:RequestInit = {}, token?:string):Promise<T> {
 const headers = new Headers(options.headers);
 headers.set("Accept","application/json");
 if(options.body) headers.set("Content-Type","application/json");
 if(token) headers.set("Authorization",`Bearer ${token}`);
 let response:Response;
 try {response = await fetch(`${BASE_URL}${path}`,{...options,headers});}
 catch {throw new ApiError(0,"Não foi possível conectar ao servidor. Verifique se o backend está iniciado.");}
 const data:unknown = await response.json().catch(()=>null);
 if(!response.ok) {
  const payload = data as {message?:string;error?:string}|null;
  throw new ApiError(response.status,payload?.message ?? payload?.error ?? "Falha na requisição");
 }
 return data as T;
}
export const api = {
 login:(email:string,password:string)=>request<LoginResponse>("/auth/login",{method:"POST",body:JSON.stringify({email,password})}),
 me:(token:string)=>request<User>("/auth/me",{},token),
 tickets:(token:string)=>request<Ticket[]>("/tickets",{},token),
};
