const DB_KEY = "harini_marketing_payroll_demo_v1";
const ADMIN_USER = "admin";
const ADMIN_PASS = "Admin@123";
const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(Number(n)||0);
const todayMonth = new Date().toISOString().slice(0,7);
let currentUser = null;

function loadDB(){
  try{
    const saved = JSON.parse(localStorage.getItem(DB_KEY));
    if(saved && Array.isArray(saved.employees) && Array.isArray(saved.payslips)) return saved;
  }catch(e){}
  const db = {employees:[],payslips:[]};
  saveDB(db); return db;
}
function saveDB(db){ localStorage.setItem(DB_KEY,JSON.stringify(db)); }
function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function showLogin(){
  $("login-view").classList.remove("hidden");$("app-view").classList.add("hidden");
  $("top-user").classList.add("hidden");currentUser=null;
}
function login(e){
  e.preventDefault(); const role=$("login-role").value, id=$("login-id").value.trim(), pass=$("login-password").value;
  $("login-error").textContent="";
  if(role==="admin" && id===ADMIN_USER && pass===ADMIN_PASS){
    currentUser={role:"admin"}; showApp(); return;
  }
  if(role==="employee"){
    const emp=loadDB().employees.find(x=>x.id.toLowerCase()===id.toLowerCase() && x.password===pass);
    if(emp){currentUser={role:"employee",id:emp.id};showApp();return;}
  }
  $("login-error").textContent="Login failed. Check your username / employee ID and password.";
}
function showApp(){
  $("login-view").classList.add("hidden");$("app-view").classList.remove("hidden");$("top-user").classList.remove("hidden");
  if(currentUser.role==="admin"){
    $("top-user").textContent="Administrator";
    $("admin-view").classList.remove("hidden");$("employee-view").classList.add("hidden");
    $("page-heading").textContent="Admin dashboard";$("welcome-text").textContent="Manage marketing employees and monthly payroll.";
    renderAdmin();
  }else{
    $("top-user").textContent="Employee: "+currentUser.id;
    $("admin-view").classList.add("hidden");$("employee-view").classList.remove("hidden");
    $("page-heading").textContent="Employee dashboard";$("welcome-text").textContent="View and print your monthly payslips.";
    renderEmployee();
  }
}
function renderAdmin(){
  const db=loadDB();
  $("stat-employees").textContent=db.employees.length;
  $("stat-slips").textContent=db.payslips.length;
  $("stat-month").textContent=new Date().toLocaleDateString("en-IN",{month:"short",year:"numeric"});
  $("employee-table").innerHTML=db.employees.length?db.employees.map(e=>`<tr><td><strong>${esc(e.id)}</strong></td><td>${esc(e.name)}</td><td>${esc(e.designation||"—")}</td><td>${esc(e.phone||"—")}</td><td><button class="table-action" data-edit="${esc(e.id)}">Edit</button><button class="table-action danger" data-delete="${esc(e.id)}">Delete</button></td></tr>`).join(""):`<tr><td colspan="5" class="muted">No employees added yet. Select “Add employee” to begin.</td></tr>`;
  $("salary-employee").innerHTML=db.employees.length?db.employees.map(e=>`<option value="${esc(e.id)}">${esc(e.id)} — ${esc(e.name)}</option>`).join(""):`<option value="">Add an employee first</option>`;
  renderRecords();
}
function openEmployeeDialog(emp){
  $("employee-form").reset();$("employee-error").textContent="";
  $("edit-original-id").value=emp?.id||"";
  $("employee-dialog-title").textContent=emp?"Edit employee":"Add employee";
  $("emp-id").value=emp?.id||"";$("emp-id").disabled=!!emp;
  $("emp-name").value=emp?.name||"";$("emp-designation").value=emp?.designation||"Marketing Executive";
  $("emp-phone").value=emp?.phone||"";$("emp-email").value=emp?.email||"";
  $("employee-dialog").showModal();
}
function saveEmployee(e){
  e.preventDefault();const db=loadDB();const original=$("edit-original-id").value;
  const id=$("emp-id").value.trim().toUpperCase(),name=$("emp-name").value.trim();
  if(!id||!name)return;
  if(!original && db.employees.some(x=>x.id===id)){ $("employee-error").textContent="That employee ID already exists.";return;}
  if(!original && db.employees.length>=20){$("employee-error").textContent="This demo is limited to 20 employees.";return;}
  if(original){
    const emp=db.employees.find(x=>x.id===original);if(!emp)return;
    emp.name=name;emp.designation=$("emp-designation").value.trim();emp.phone=$("emp-phone").value.trim();emp.email=$("emp-email").value.trim();
  }else{
    db.employees.push({id,name,designation:$("emp-designation").value.trim(),phone:$("emp-phone").value.trim(),email:$("emp-email").value.trim(),password:"Welcome@123"});
  }
  saveDB(db);$("employee-dialog").close();renderAdmin();
}
function deleteEmployee(id){
  if(!confirm(`Delete employee ${id}? Their payslip records will also be deleted.`))return;
  const db=loadDB();db.employees=db.employees.filter(e=>e.id!==id);db.payslips=db.payslips.filter(p=>p.employeeId!==id);saveDB(db);renderAdmin();
}
function num(id){return Math.max(0,Number($(id).value)||0);}
function calc(){const gross=num("basic")+num("hra")+num("allowances")+num("incentives");return {gross,net:gross-num("deductions")};}
function updatePreview(){$("net-preview").textContent=money(calc().net);}
function savePayslip(e){
  e.preventDefault();const db=loadDB(),employee=db.employees.find(x=>x.id===$("salary-employee").value);
  if(!employee){$("salary-message").textContent="Please add an employee first.";return;}
  const month=$("salary-month").value;if(!month){$("salary-message").textContent="Select a salary month.";return;}
  const duplicate=db.payslips.find(p=>p.employeeId===employee.id&&p.month===month);
  if(duplicate && !confirm("A payslip already exists for this employee and month. Replace it?"))return;
  const gross=num("basic")+num("hra")+num("allowances")+num("incentives"),deductions=num("deductions");
  const slip={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),employeeId:employee.id,month,paymentDate:$("pay-date").value,
    basic:num("basic"),hra:num("hra"),allowances:num("allowances"),incentives:num("incentives"),deductions,gross,net:gross-deductions,notes:$("salary-notes").value.trim(),createdAt:new Date().toISOString()};
  if(duplicate)db.payslips=db.payslips.filter(p=>!(p.employeeId===employee.id&&p.month===month));
  db.payslips.push(slip);saveDB(db);$("salary-message").textContent="Payslip saved in this browser.";renderAdmin();
}
function renderRecords(){
  const db=loadDB(),q=($("record-search").value||"").toLowerCase();
  const slips=db.payslips.filter(p=>{const e=db.employees.find(x=>x.id===p.employeeId);return (p.month+" "+p.employeeId+" "+(e?.name||"")).toLowerCase().includes(q);}).sort((a,b)=>b.month.localeCompare(a.month));
  $("records-table").innerHTML=slips.length?slips.map(p=>{const e=db.employees.find(x=>x.id===p.employeeId);return `<tr><td>${esc(p.month)}</td><td>${esc(e?.name||p.employeeId)} <span class="muted">(${esc(p.employeeId)})</span></td><td>${money(p.gross)}</td><td><strong>${money(p.net)}</strong></td><td><button class="table-action" data-print="${esc(p.id)}">View / Print</button></td></tr>`;}).join(""):`<tr><td colspan="5" class="muted">No payslip records found.</td></tr>`;
}
function renderEmployee(){
  const db=loadDB(),emp=db.employees.find(e=>e.id===currentUser.id);
  if(!emp){showLogin();return;}
  $("my-profile").innerHTML=`<strong>${esc(emp.name)}</strong> · ${esc(emp.id)} · ${esc(emp.designation||"Marketing Employee")} · ${esc(emp.email||"")}`;
  const slips=db.payslips.filter(p=>p.employeeId===emp.id).sort((a,b)=>b.month.localeCompare(a.month));
  $("my-records-table").innerHTML=slips.length?slips.map(p=>`<tr><td>${esc(p.month)}</td><td>${money(p.gross)}</td><td>${money(p.deductions)}</td><td><strong>${money(p.net)}</strong></td><td><button class="table-action" data-print="${esc(p.id)}">View / Print</button></td></tr>`).join(""):"";
  $("no-my-records").textContent=slips.length?"":"No payslips have been published for your account yet.";
}
function printSlip(id){
  const db=loadDB(),p=db.payslips.find(x=>x.id===id);if(!p)return;
  if(currentUser.role==="employee"&&p.employeeId!==currentUser.id){alert("You can only view your own payslips.");return;}
  const e=db.employees.find(x=>x.id===p.employeeId);if(!e)return;
  const monthDate=new Date(p.month+"-01T00:00:00");
  $("print-area").innerHTML=`<article class="payslip">
    <h2>HARINI HOSPITALS</h2><p class="sub">Marketing Department · Monthly Salary Slip</p><hr>
    <table><tbody>
      <tr><td><b>Employee name</b></td><td>${esc(e.name)}</td><td><b>Employee ID</b></td><td>${esc(e.id)}</td></tr>
      <tr><td><b>Designation</b></td><td>${esc(e.designation||"—")}</td><td><b>Salary month</b></td><td>${monthDate.toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</td></tr>
      <tr><td><b>Payment date</b></td><td colspan="3">${esc(p.paymentDate||"—")}</td></tr>
    </tbody></table>
    <h3>Earnings and deductions</h3>
    <table><thead><tr><th>Description</th><th>Amount</th><th>Description</th><th>Amount</th></tr></thead><tbody>
      <tr><td>Basic salary</td><td>${money(p.basic)}</td><td>Deductions</td><td>${money(p.deductions)}</td></tr>
      <tr><td>HRA</td><td>${money(p.hra)}</td><td></td><td></td></tr>
      <tr><td>Other allowances</td><td>${money(p.allowances)}</td><td></td><td></td></tr>
      <tr><td>Incentives</td><td>${money(p.incentives)}</td><td></td><td></td></tr>
      <tr><td><b>Gross earnings</b></td><td><b>${money(p.gross)}</b></td><td><b>Total deductions</b></td><td><b>${money(p.deductions)}</b></td></tr>
    </tbody></table>
    <p class="net">Net salary payable: ${money(p.net)}</p>
    <p><b>Amount in words:</b> ${esc(numberWordsIndian(Math.round(p.net))) } rupees only.</p>
    ${p.notes?`<p><b>Notes:</b> ${esc(p.notes)}</p>`:""}
    <p class="sub">This is a computer-generated demonstration payslip.</p>
    <div class="signature"><span>Employee signature: __________________</span><span>Authorized signatory: __________________</span></div>
    <div class="print-actions"><button class="btn primary" onclick="window.print()">Print / Save as PDF</button> <button class="btn outline" onclick="document.getElementById('print-area').innerHTML='';document.getElementById('print-area').classList.add('hidden')">Close</button></div>
  </article>`;
  $("print-area").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});
}
function numberWordsIndian(n){
  if(!Number.isFinite(n)||n<0)return "zero";
  if(n===0)return "zero";
  const ones=["","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
  const tens=["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];
  function under1000(x){let s="";if(x>=100){s+=ones[Math.floor(x/100)]+" hundred ";x%=100;}if(x>=20){s+=tens[Math.floor(x/10)]+" ";x%=10;}if(x>0)s+=ones[x]+" ";return s.trim();}
  let out="";const units=[[10000000,"crore"],[100000,"lakh"],[1000,"thousand"],[1,""]];
  for(const [v,label] of units){if(n>=v){const q=Math.floor(n/v);out+=under1000(q)+(label?" "+label:"")+" ";n%=v;}}
  return out.trim();
}
function switchTab(id){
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===id));
  ["employees-panel","salary-panel","records-panel"].forEach(x=>$(x).classList.toggle("hidden",x!==id));
}

// SMS OTP password recovery. The MSG91 Auth Key stays on the Node.js server.
let resetEmployeeId = null;
let resetVerified = false;
async function apiPost(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed. Please try again.");
  return data;
}
function openForgotDialog() {
  $("forgot-form").reset();
  $("forgot-message").textContent = "";
  $("forgot-step-mobile").classList.remove("hidden");
  $("forgot-step-otp").classList.add("hidden");
  $("forgot-step-password").classList.add("hidden");
  $("send-otp-btn").disabled = false;
  resetEmployeeId = null;
  resetVerified = false;
  $("forgot-dialog").showModal();
}
function normalizedIndianMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return "91" + digits;
  return null;
}
async function sendEmployeeOtp() {
  $("forgot-message").className = "error";
  $("forgot-message").textContent = "";
  const id = $("forgot-employee-id").value.trim().toUpperCase();
  const mobile = normalizedIndianMobile($("forgot-mobile").value);
  if (!id) { $("forgot-message").textContent = "Enter your Employee ID."; return; }
  if (!mobile) { $("forgot-message").textContent = "Enter a valid 10-digit Indian mobile number."; return; }

  // This matching check is for the local demo only; browser storage is not a trusted identity database.
  const employee = loadDB().employees.find(emp =>
    emp.id.toUpperCase() === id && String(emp.phone || "").replace(/\D/g,"").slice(-10) === mobile.slice(-10)
  );
  if (!employee) {
    $("forgot-message").textContent = "Employee ID and registered mobile number do not match.";
    return;
  }
  $("send-otp-btn").disabled = true;
  try {
    await apiPost("/api/otp/send", {mobile});
    resetEmployeeId = employee.id;
    $("forgot-step-mobile").classList.add("hidden");
    $("forgot-step-otp").classList.remove("hidden");
    $("forgot-message").className = "success";
    $("forgot-message").textContent = "OTP sent. Check your mobile messages.";
  } catch (err) {
    $("forgot-message").textContent = err.message;
  } finally {
    $("send-otp-btn").disabled = false;
  }
}
async function verifyEmployeeOtp() {
  $("forgot-message").className = "error";
  $("forgot-message").textContent = "";
  const mobile = normalizedIndianMobile($("forgot-mobile").value);
  const otp = $("forgot-otp").value.trim();
  if (!/^\d{6}$/.test(otp)) { $("forgot-message").textContent = "Enter the six-digit OTP."; return; }
  try {
    await apiPost("/api/otp/verify", {mobile, otp});
    resetVerified = true;
    $("forgot-step-otp").classList.add("hidden");
    $("forgot-step-password").classList.remove("hidden");
    $("forgot-message").className = "success";
    $("forgot-message").textContent = "Mobile number verified successfully.";
  } catch (err) {
    $("forgot-message").textContent = err.message;
  }
}
function saveEmployeeNewPassword() {
  $("forgot-message").className = "error";
  $("forgot-message").textContent = "";
  if (!resetVerified || !resetEmployeeId) {
    $("forgot-message").textContent = "Please verify your OTP first."; return;
  }
  const password = $("new-password").value;
  const confirm = $("confirm-new-password").value;
  if (password.length < 8) { $("forgot-message").textContent = "Password must be at least 8 characters."; return; }
  if (password !== confirm) { $("forgot-message").textContent = "Passwords do not match."; return; }

  // Demo-only update: actual production password changes must be performed in a server-side user database.
  const db = loadDB();
  const employee = db.employees.find(emp => emp.id === resetEmployeeId);
  if (!employee) { $("forgot-message").textContent = "Employee record not found."; return; }
  employee.password = password;
  saveDB(db);
  alert("Password updated in this local demo. Please sign in with your new password.");
  $("forgot-dialog").close();
  $("login-role").value = "employee";
  $("login-id").value = resetEmployeeId;
  $("login-password").value = "";
}

document.addEventListener("DOMContentLoaded",()=>{
  $("year").textContent=new Date().getFullYear();$("salary-month").value=todayMonth;$("pay-date").value=new Date().toISOString().slice(0,10);
  $("login-form").addEventListener("submit",login);$("logout-btn").addEventListener("click",showLogin);
  $("forgot-password").addEventListener("click",openForgotDialog);
  $("close-forgot").addEventListener("click",()=>$("forgot-dialog").close());
  $("send-otp-btn").addEventListener("click",sendEmployeeOtp);
  $("verify-otp-btn").addEventListener("click",verifyEmployeeOtp);
  $("save-new-password-btn").addEventListener("click",saveEmployeeNewPassword);
  $("add-employee-btn").addEventListener("click",()=>openEmployeeDialog(null));
  $("employee-form").addEventListener("submit",saveEmployee);
  $("close-dialog").addEventListener("click",()=>$("employee-dialog").close());
  $("cancel-employee").addEventListener("click",()=>$("employee-dialog").close());
  $("salary-form").addEventListener("submit",savePayslip);$("record-search").addEventListener("input",renderRecords);
  ["basic","hra","allowances","incentives","deductions"].forEach(id=>$(id).addEventListener("input",updatePreview));
  document.querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>switchTab(t.dataset.tab)));
  $("employee-table").addEventListener("click",e=>{
    const edit=e.target.dataset.edit,del=e.target.dataset.delete;
    if(edit){const emp=loadDB().employees.find(x=>x.id===edit);if(emp)openEmployeeDialog(emp);}
    if(del)deleteEmployee(del);
  });
  document.addEventListener("click",e=>{if(e.target.dataset.print)printSlip(e.target.dataset.print);});
  updatePreview();
});