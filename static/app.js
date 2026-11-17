const $ = id => document.getElementById(id);
let products = [];
const money = value => "PKR " + Number(value || 0).toLocaleString("en-PK", {maximumFractionDigits:2});
async function api(url, options={}) {
  const response = await fetch(url, {headers:{"Content-Type":"application/json"}, ...options});
  const data = await response.json().catch(()=>({error:"Invalid server response"}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2600)}
async function load(){
  try {
    const q=$("search").value.trim();
    [products, stats] = await Promise.all([api("/api/products?q="+encodeURIComponent(q)),api("/api/stats")]);
    $("totalProducts").textContent=stats.total_products;
    $("totalUnits").textContent=stats.total_units.toLocaleString();
    $("inventoryValue").textContent=money(stats.inventory_value);
    $("lowStock").textContent=stats.low_stock;
    $("outStock").textContent=stats.out_of_stock;
    $("productCount").textContent=products.length+" items";
    $("productRows").innerHTML=products.map(p=>{
      const cls=p.stock_status==="In Stock"?"in":p.stock_status==="Low Stock"?"low":"out";
      return `<tr><td>${esc(p.name)}<span class="sub-id">${esc(p.product_id)}${p.type==="perishable"?" · Perishable":""}</span></td>
      <td>${esc(p.category)}</td><td>${money(p.price)}</td><td>${p.quantity}</td>
      <td><span class="status ${cls}">${p.stock_status}</span></td>
      <td><div class="actions"><button class="text-btn" data-edit="${esc(p.product_id)}">Edit</button><button class="text-btn delete" data-delete="${esc(p.product_id)}">Delete</button></div></td></tr>`;
    }).join("");
    $("emptyState").style.display=products.length?"none":"block";
  } catch(e){toast(e.message)}
}
function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function showForm(product=null){
  $("productForm").reset();$("productId").value=product?.product_id||"";
  $("formTitle").textContent=product?"Edit product":"Add a product";
  $("name").value=product?.name||"";$("category").value=product?.category||"";
  $("price").value=product?.price??"";$("quantity").value=product?.quantity??"";
  $("reorder").value=product?.reorder_level??5;$("description").value=product?.description||"";
  $("perishable").checked=product?.type==="perishable";$("expiry").value=product?.expiry_date||"";
  $("expiryWrap").classList.toggle("hidden",!$("perishable").checked);
  $("formMessage").textContent="";$("formPanel").classList.add("open");
  $("formPanel").scrollIntoView({behavior:"smooth",block:"start"});
}
function closeForm(){$("formPanel").classList.remove("open")}
$("addTop").onclick=()=>showForm();$("closeForm").onclick=closeForm;$("cancelForm").onclick=closeForm;
$("refresh").onclick=load;$("search").addEventListener("input",load);
$("perishable").onchange=()=> $("expiryWrap").classList.toggle("hidden",!$("perishable").checked);
$("productRows").addEventListener("click",async e=>{
  const edit=e.target.dataset.edit, del=e.target.dataset.delete;
  if(edit){const p=products.find(x=>x.product_id===edit);if(p)showForm(p)}
  if(del && confirm("Delete this product?")){try{await api("/api/products/"+encodeURIComponent(del),{method:"DELETE"});toast("Product deleted.");load()}catch(err){toast(err.message)}}
});
$("productForm").onsubmit=async e=>{
  e.preventDefault();
  const id=$("productId").value;
  const body={name:$("name").value,category:$("category").value,price:$("price").value,
    quantity:$("quantity").value,reorder_level:$("reorder").value,description:$("description").value,
    type:$("perishable").checked?"perishable":"standard",expiry_date:$("expiry").value};
  try{await api(id?"/api/products/"+encodeURIComponent(id):"/api/products",{method:id?"PUT":"POST",body:JSON.stringify(body)});
    toast(id?"Product updated.":"Product added.");closeForm();load();
  }catch(err){$("formMessage").textContent=err.message}
};
async function runAI(action,payload={}){
  $("aiResult").textContent="Thinking…";
  try{const data=await api("/api/ai/"+action,{method:"POST",body:JSON.stringify(payload)});$("aiResult").textContent=data.answer}
  catch(err){$("aiResult").textContent=err.message}
}
document.querySelectorAll("[data-ai]").forEach(btn=>btn.onclick=()=>runAI(btn.dataset.ai));
$("askBtn").onclick=()=>{const q=$("question").value.trim();if(!q)return toast("Type a question first.");runAI("assistant",{question:q})};
$("question").addEventListener("keydown",e=>{if(e.key==="Enter")$("askBtn").click()});
$("generateDescription").onclick=async()=>{
  if(!$("name").value.trim()||!$("category").value.trim())return toast("Enter product name and category first.");
  $("generateDescription").disabled=true;
  try{const d=await api("/api/ai/description",{method:"POST",body:JSON.stringify({name:$("name").value,category:$("category").value,price:$("price").value,details:$("description").value})});$("description").value=d.answer}
  catch(e){toast(e.message)}finally{$("generateDescription").disabled=false}
};
load();
