// Harini Hospitals payslip demo - MSG91 OTP backend
// Node.js 18+ required. Keep MSG91_AUTHKEY in .env; never expose it to the browser.
require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json({limit:"10kb"}));
app.use(express.static(__dirname));

const PORT = Number(process.env.PORT || 3000);
const AUTHKEY = process.env.MSG91_AUTHKEY;
const TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
const OTP_LENGTH = Number(process.env.MSG91_OTP_LENGTH || 6);
const OTP_EXPIRY = Number(process.env.MSG91_OTP_EXPIRY || 5);
const sendAttempts = new Map();

function normalizeMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return "91" + digits;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}
function requireConfig(res) {
  if (!AUTHKEY || !TEMPLATE_ID) {
    res.status(503).json({error:"SMS service is not configured. Add MSG91_AUTHKEY and MSG91_TEMPLATE_ID to .env."});
    return false;
  }
  return true;
}
app.post("/api/otp/send", async (req,res) => {
  if (!requireConfig(res)) return;
  const mobile = normalizeMobile(req.body.mobile);
  if (!mobile) return res.status(400).json({error:"Enter a valid Indian mobile number."});

  const now = Date.now();
  const old = sendAttempts.get(mobile) || {count:0,last:0,windowStart:now};
  if (now - old.windowStart > 60*60*1000) {old.count=0;old.windowStart=now;}
  if (now - old.last < 60*1000) return res.status(429).json({error:"Please wait 60 seconds before requesting another OTP."});
  if (old.count >= 5) return res.status(429).json({error:"OTP request limit reached. Try again after one hour."});

  try {
    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.searchParams.set("template_id", TEMPLATE_ID);
    url.searchParams.set("mobile", mobile);
    url.searchParams.set("otp_length", String(OTP_LENGTH));
    url.searchParams.set("otp_expiry", String(OTP_EXPIRY));
    const response = await fetch(url, {
      method:"POST",
      headers:{"authkey":AUTHKEY,"content-type":"application/json"},
      body:JSON.stringify({})
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok || (data.type && data.type !== "success")) {
      console.error("MSG91 send OTP error:", response.status, data);
      return res.status(502).json({error:"SMS provider could not send OTP. Check MSG91 template and account configuration."});
    }
    old.count += 1; old.last = now; sendAttempts.set(mobile,old);
    return res.json({success:true,message:"OTP request accepted by SMS provider."});
  } catch (err) {
    console.error("Send OTP failed:",err.message);
    return res.status(502).json({error:"Could not connect to SMS provider."});
  }
});

app.post("/api/otp/verify", async (req,res) => {
  if (!requireConfig(res)) return;
  const mobile = normalizeMobile(req.body.mobile);
  const otp = String(req.body.otp || "").trim();
  if (!mobile || !new RegExp("^\\\\d{" + OTP_LENGTH + "}$").test(otp)) {
    return res.status(400).json({error:"Invalid mobile number or OTP format."});
  }
  try {
    const url = new URL("https://control.msg91.com/api/v5/otp/verify");
    url.searchParams.set("mobile",mobile);
    url.searchParams.set("otp",otp);
    const response = await fetch(url, {method:"GET",headers:{"authkey":AUTHKEY}});
    const data = await response.json().catch(()=>({}));
    if (!response.ok || (data.type && data.type !== "success")) {
      return res.status(400).json({error:"OTP verification failed. Check the OTP and try again."});
    }
    sendAttempts.delete(mobile);
    return res.json({success:true,message:"OTP verified."});
  } catch (err) {
    console.error("Verify OTP failed:",err.message);
    return res.status(502).json({error:"Could not verify OTP with SMS provider."});
  }
});

app.get("/api/health",(req,res)=>res.json({ok:true}));
app.listen(PORT,()=>console.log(`Payslip demo running at http://localhost:${PORT}`));
