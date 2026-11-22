// ╔══════════════════════════════════════════════════════════════════╗
// ║  OddsLab ANALYTICS — Code.gs v6.0                               ║
// ║  The Odds API (cotes réelles) · Gemini AI · Zéro démo           ║
// ╚══════════════════════════════════════════════════════════════════╝

var CFG = {
  // ── APIs ────────────────────────────────────────────────────────
  ODDS_KEY: "",   // The Odds API
  ODDS_BASE:   "https://api.the-odds-api.com/v4",

  GEMINI_KEY: "",               // ← remplacer
  GEMINI_URL:  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",

  // ── App ─────────────────────────────────────────────────────────
  VER:         "6.1.0",
  CACHE_TTL:   900,    // 15 min pour les cotes
  CACHE_AI:    3600,   // 30 min pour l'analyse Gemini
  REGION:      "eu",
  ADMIN_EMAIL: "",
  ADMIN_PASS: "",
  PAYPAL_PLAN: "YOUR_PAYPAL_PLAN_ID",

  // Fenêtre d'événements : uniquement les matchs à venir dans les 48h
  WINDOW_H:    48,

  // ── Ligues ──────────────────────────────────────────────────────
  LEAGUES: [
    { key:"soccer_epl", name:"Premier League", country:"England", flag:"🏴", avgGoals:2.82, homeAdv:0.38 },
    { key:"soccer_spain_la_liga", name:"La Liga", country:"Spain", flag:"🇪🇸", avgGoals:2.60, homeAdv:0.36 },
    { key:"soccer_italy_serie_a", name:"Serie A", country:"Italy", flag:"🇮🇹", avgGoals:2.65, homeAdv:0.34 },
    { key:"soccer_germany_bundesliga", name:"Bundesliga", country:"Germany", flag:"🇩🇪", avgGoals:3.17, homeAdv:0.40 },
    { key:"soccer_france_ligue_one", name:"Ligue 1", country:"France", flag:"🇫🇷", avgGoals:2.55, homeAdv:0.35 },
    { key:"soccer_uefa_champs_league", name:"Champions League", country:"Europe", flag:"🌍", avgGoals:2.90, homeAdv:0.30 },
    { key:"soccer_uefa_europa_league", name:"Europa League", country:"Europe", flag:"🌍", avgGoals:2.80, homeAdv:0.30 },
    { key:"soccer_uefa_europa_conference_league", name:"Conference League", country:"Europe", flag:"🌍", avgGoals:2.75, homeAdv:0.30 },
    { key:"soccer_netherlands_eredivisie", name:"Eredivisie", country:"Netherlands", flag:"🇳🇱", avgGoals:3.10, homeAdv:0.35 },
    { key:"soccer_portugal_primeira_liga", name:"Primeira Liga", country:"Portugal", flag:"🇵🇹", avgGoals:2.55, homeAdv:0.34 },
    { key:"soccer_efl_champ", name:"Championship", country:"England", flag:"🏴", avgGoals:2.55, homeAdv:0.32 },
    { key:"soccer_spl", name:"Scottish Premiership", country:"Scotland", flag:"🏴", avgGoals:2.80, homeAdv:0.34 },
    { key:"soccer_turkey_super_league", name:"Süper Lig", country:"Turkey", flag:"🇹🇷", avgGoals:2.90, homeAdv:0.35 },
    { key:"soccer_saudi_arabia_pro_league", name:"Saudi Pro League", country:"Saudi Arabia", flag:"🇸🇦", avgGoals:3.05, homeAdv:0.30 },
    { key:"soccer_usa_mls", name:"MLS", country:"USA", flag:"🇺🇸", avgGoals:2.90, homeAdv:0.35 },
    { key:"soccer_brazil_campeonato", name:"Brasileirão", country:"Brazil", flag:"🇧🇷", avgGoals:2.45, homeAdv:0.33 },
    { key:"soccer_argentina_primera_division", name:"Primera División", country:"Argentina", flag:"🇦🇷", avgGoals:2.20, homeAdv:0.35 },
    { key:"soccer_belgium_first_div", name:"Belgian Pro League", country:"Belgium", flag:"🇧🇪", avgGoals:2.90, homeAdv:0.34 },
    { key:"soccer_austria_bundesliga", name:"Austrian Bundesliga", country:"Austria", flag:"🇦🇹", avgGoals:3.00, homeAdv:0.35 },
    { key:"soccer_germany_bundesliga2", name:"2. Bundesliga", country:"Germany", flag:"🇩🇪", avgGoals:2.95, homeAdv:0.34 },
    { key:"soccer_france_ligue_two", name:"Ligue 2", country:"France", flag:"🇫🇷", avgGoals:2.40, homeAdv:0.34 },
    { key:"soccer_italy_serie_b", name:"Serie B", country:"Italy", flag:"🇮🇹", avgGoals:2.35, homeAdv:0.33 },
    { key:"soccer_spain_segunda_division", name:"LaLiga 2", country:"Spain", flag:"🇪🇸", avgGoals:2.40, homeAdv:0.33 },
    { key:"soccer_mexico_ligamx", name:"Liga MX", country:"Mexico", flag:"🇲🇽", avgGoals:2.70, homeAdv:0.35 },
    { key:"soccer_conmebol_copa_libertadores", name:"Copa Libertadores", country:"South America", flag:"🌎", avgGoals:2.55, homeAdv:0.35 }
  ],

  PLANS:  { free:{daily:5,scanner:false}, premium:{daily:-1,scanner:true}, admin:{daily:-1,scanner:true} },
  SHEETS: { users:"Users_v5", logs:"Logs_v5" }
};

// ══════════════════════════════════════════════════════════════════
//  ENTRY POINTS
// ══════════════════════════════════════════════════════════════════
function doGet(e) {
  var p = e && e.parameter ? e.parameter : {};
  if (!p.action) {
    return HtmlService.createHtmlOutputFromFile("index")
      .setTitle("OddsLab Analytics")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag("viewport","width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no");
  }
  var out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);
  try {
    out.setContent(JSON.stringify({ ok:true, data:routeGet(p), ts:Date.now(), v:CFG.VER }));
  } catch(err) {
    out.setContent(JSON.stringify({ ok:false, error:err.toString().replace(/Error:\s*/,"").trim() }));
  }
  return out;
}

function doPost(e) {
  var out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);
  try {
    var body = JSON.parse(e.postData.contents || "{}");
    out.setContent(JSON.stringify({ ok:true, data:routePost(body) }));
  } catch(err) {
    out.setContent(JSON.stringify({ ok:false, error:err.toString().replace(/Error:\s*/,"").trim() }));
  }
  return out;
}

function routeGet(p) {
  switch(p.action) {
    case "dashboard":   return getDashboard();
    case "matches":     return getAllMatches();
    case "league":      return getLeagueMatches(p.leagueKey);
    case "analysis":    return getMatchAnalysis(p.matchId);
    case "scanner":     return getValueScanner();
    case "safebets":    return getSafeBets();
    case "admin":       requireAdmin_(p.token); return adminStats_();
    case "admin_users": requireAdmin_(p.token); return adminUsers_();
    case "public_config": return getPublicConfig_();
    case "ping":        return { v:CFG.VER, ts:Date.now() };
    default: throw new Error("Unknown action: "+p.action);
  }
}

function routePost(b) {
  switch(b.action) {
    case "login":          return loginUser(b.email, b.password);
    case "register":       return registerUser(b.email, b.password, b.name);
    case "paypal_success": return paypalSuccess_(b.subscriptionId, b.email);
    case "admin_disable":  requireAdmin_(b.token); return adminDisable_(b.userId, b.disabled);
    default: throw new Error("Unknown action: "+b.action);
  }
}

// ══════════════════════════════════════════════════════════════════
//  DATABASE
// ══════════════════════════════════════════════════════════════════
function getDB() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty("DB_ID_V5"), ss;
  if(id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if(!ss) {
      ss = SpreadsheetApp.create("OddsLab_Analytics_v6");
      props.setProperty("DB_ID_V5", ss.getId());
    }
  }
  return ss;
}

// Exécuter une fois depuis l’éditeur Apps Script pour autoriser Sheets
// et créer la base lorsque le projet n’est lié à aucune feuille.
function setupDatabase() {
  var ss = getDB();
  getSheet(CFG.SHEETS.users);
  getSheet(CFG.SHEETS.logs);
  return { spreadsheetId:ss.getId(), url:ss.getUrl() };
}
function getSheet(name) {
  var ss = getDB(), sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (name === CFG.SHEETS.users) sh.appendRow(["id","email","hash","name","plan","sub_id","created","last_login","disabled"]);
    if (name === CFG.SHEETS.logs)  sh.appendRow(["ts","uid","action","detail"]);
    sh.getRange("1:1").setFontWeight("bold");
  }
  return sh;
}
function md5(s)   { return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5,s).map(function(b){return("0"+(b<0?b+256:b).toString(16)).slice(-2);}).join(""); }
function uid()    { return "u"+Date.now().toString(36)+Math.random().toString(36).substr(2,5); }
function authSecret_() {
  var props=PropertiesService.getScriptProperties(), secret=props.getProperty("ODDSLAB_AUTH_SECRET");
  if(!secret){secret=Utilities.getUuid()+Utilities.getUuid();props.setProperty("ODDSLAB_AUTH_SECRET",secret);}
  return secret;
}
function tok(e,h) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(e)+"\\n"+String(h),authSecret())).replace(/=+$/,"");
}
function requireAdmin_(token) {
  var email=getSecret_("ADMIN_EMAIL").toLowerCase(), pass=getSecret_("ADMIN_PASS");
  if(!email||!pass||!token) throw new Error("Action réservée à l'administrateur.");
  var expected=tok(email,md5(pass));
  if(String(token)!==expected) throw new Error("Session administrateur invalide. Reconnectez-vous.");
  return true;
}
function slog(id,a,d) { try{getSheet(CFG.SHEETS.logs).appendRow([new Date().toISOString(),id,a,d||""]);}catch(e){} }

// ══════════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════════
function getSecret_(name) {
  return PropertiesService.getScriptProperties().getProperty(name) || "";
}

function authFailKey_(email) { return "auth_fail_"+md5(String(email||"").toLowerCase()); }
function checkAuthRate_(email) {
  var count=Number(CacheService.getScriptCache().get(authFailKey_(email))||0);
  if(count>=8) throw new Error("Trop de tentatives. Réessayez dans 15 minutes.");
}
function recordAuthFailure_(email) {
  var cache=CacheService.getScriptCache(), key=authFailKey_(email);
  cache.put(key,String(Number(cache.get(key)||0)+1),900);
}
function clearAuthFailures_(email) { CacheService.getScriptCache().remove(authFailKey_(email)); }
function safeEqual_(a,b) {
  a=String(a||"");b=String(b||"");
  var diff=a.length^b.length, n=Math.max(a.length,b.length);
  for(var i=0;i<n;i++) diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);
  return diff===0;
}
function digestHex_(bytes) {
  return bytes.map(function(b){return ("0"+(b<0?b+256:b).toString(16)).slice(-2);}).join("");
}
function makePasswordHash_(password) {
  var salt=Utilities.getUuid().replace(/-/g,"");
  return "s256$"+salt+"$"+digestHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,salt+":"+password));
}
function verifyPassword_(password, stored) {
  stored=String(stored||"");
  if(stored.indexOf("s256$")===0){
    var p=stored.split("$");
    return p.length===3&&safeEqual_(p[2],digestHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,p[1]+":"+password)));
  }
  return safeEqual_(stored,md5(password));
}

function loginUser(email, password) {
  if(!email||!password) throw new Error("Champs requis");
  email=String(email).trim().toLowerCase();
  checkAuthRate_(email);
  var adminEmail=getSecret_("ADMIN_EMAIL").trim().toLowerCase(), adminPass=getSecret_("ADMIN_PASS");
  if(adminEmail&&adminPass&&email===adminEmail&&safeEqual_(password,adminPass)){
    clearAuthFailures_(email);
    return {user:{id:"admin",email:adminEmail,name:"Admin",plan:"admin"},token:tok(email,md5(password))};
  }
  var sh=getSheet(CFG.SHEETS.users), rows=sh.getDataRange().getValues();
  for(var i=1;i<rows.length;i++){
    var row=rows[i], rowEmail=String(row[1]||"").trim().toLowerCase();
    if(rowEmail===email&&verifyPassword_(password,row[2])){
      if(row[8]===true||row[8]==="TRUE") throw new Error("Compte désactivé");
      var currentHash=String(row[2]||"");
      if(currentHash.indexOf("s256$")!==0){
        currentHash=makePasswordHash_(password);
        sh.getRange(i+1,3).setValue(currentHash);
      }
      sh.getRange(i+1,8).setValue(new Date().toISOString());
      clearAuthFailures_(email);
      slog(row[0],"login","");
      return {user:{id:row[0],email:row[1],name:row[3],plan:row[4]||"free"},token:tok(email,currentHash)};
    }
  }
  recordAuthFailure_(email);
  throw new Error("Email ou mot de passe incorrect");
}

function registerUser(email, password, name) {
  if(!email||!password) throw new Error("Email et mot de passe requis");
  email=String(email).trim().toLowerCase();
  password=String(password);
  name=String(name||email.split("@")[0]).trim().slice(0,80);
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Adresse email invalide");
  if(password.length<10) throw new Error("Mot de passe trop court (10 caractères minimum)");
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(5000)) throw new Error("Service occupé, réessayez.");
  try {
    var sh=getSheet(CFG.SHEETS.users), rows=sh.getDataRange().getValues();
    for(var i=1;i<rows.length;i++) if(String(rows[i][1]||"").trim().toLowerCase()===email) throw new Error("Email déjà utilisé");
    var id=uid(), now=new Date().toISOString(), hash=makePasswordHash_(password);
    sh.appendRow([id,email,hash,name,"free","",now,now,false]);
    slog(id,"register","");
    return {user:{id:id,email:email,name:name,plan:"free"},token:tok(email,hash)};
  } finally {
    lock.releaseLock();
  }
}

function paypalApiBase_() {
  var env=getSecret_("PAYPAL_ENV").toLowerCase();
  if(env!=="sandbox"&&env!=="live") throw new Error("PAYPAL_ENV doit être sandbox ou live.");
  return env==="sandbox"?"https://api-m.sandbox.paypal.com":"https://api-m.paypal.com";
}

function paypalAccessToken_() {
  var clientId=getSecret_("PAYPAL_CLIENT_ID"), secret=getSecret_("PAYPAL_CLIENT_SECRET");
  if(!clientId||!secret||/YOUR_|CHANGE_ME/i.test(clientId+secret))
    throw new Error("Paiement indisponible : configurez les identifiants PayPal côté serveur.");
  var response=UrlFetchApp.fetch(paypalApiBase_()+"/v1/oauth2/token",{
    method:"post",
    contentType:"application/x-www-form-urlencoded",
    headers:{Authorization:"Basic "+Utilities.base64Encode(clientId+":"+secret)},
    payload:"grant_type=client_credentials",
    muteHttpExceptions:true
  });
  if(response.getResponseCode()!==200) throw new Error("Authentification PayPal impossible.");
  var body=JSON.parse(response.getContentText());
  if(!body.access_token) throw new Error("PayPal n'a pas fourni de jeton.");
  return body.access_token;
}

function verifyPaypalSubscription_(subId, email) {
  var planId=getSecret_("PAYPAL_PLAN_ID");
  if(!planId||/YOUR_|CHANGE_ME/i.test(planId)) throw new Error("PAYPAL_PLAN_ID n'est pas configuré.");
  var safeId=String(subId||"");
  if(!/^[A-Za-z0-9-]{5,80}$/.test(safeId)) throw new Error("Identifiant d'abonnement invalide.");
  var response=UrlFetchApp.fetch(paypalApiBase_()+"/v1/billing/subscriptions/"+encodeURIComponent(safeId),{
    method:"get",
    headers:{Authorization:"Bearer "+paypalAccessToken_(),Accept:"application/json"},
    muteHttpExceptions:true
  });
  if(response.getResponseCode()!==200) throw new Error("Abonnement PayPal introuvable ou non vérifiable.");
  var sub=JSON.parse(response.getContentText()), subscriber=sub.subscriber||{};
  if(sub.status!=="ACTIVE"||sub.plan_id!==planId)
    throw new Error("L'abonnement PayPal n'est pas actif sur le forfait attendu.");
  if(!subscriber.email_address||subscriber.email_address.toLowerCase()!==String(email||"").toLowerCase())
    throw new Error("L'adresse du compte ne correspond pas à l'acheteur PayPal.");
  return sub;
}

function paypalSuccess_(subId, email) {
  if(!subId||!email) throw new Error("Données invalides");
  email=String(email).trim().toLowerCase();
  var verified=verifyPaypalSubscription_(subId,email);
  var sh=getSheet(CFG.SHEETS.users), rows=sh.getDataRange().getValues();
  for(var i=1;i<rows.length;i++){
    if(String(rows[i][1]||"").toLowerCase()===email){
      if(rows[i][5]===subId&&rows[i][4]==="premium") return {upgraded:true,plan:"premium",verified:true};
      sh.getRange(i+1,5).setValue("premium");
      sh.getRange(i+1,6).setValue(subId);
      slog(rows[i][0],"upgrade","PayPal verified:"+verified.status);
      return {upgraded:true,plan:"premium",verified:true};
    }
  }
  throw new Error("Utilisateur non trouvé");
}

// ══════════════════════════════════════════════════════════════════
//  THE ODDS API — Cotes réelles
// ══════════════════════════════════════════════════════════════════
function fetchOdds(sportKey) {
  var oddsKey = getSecret_("ODDS_KEY");
  if(!oddsKey) throw new Error("Clé Odds API manquante : définir la propriété de script ODDS_KEY.");
  var url = CFG.ODDS_BASE+"/sports/"+sportKey+"/odds/"
    +"?apiKey="+oddsKey
    +"&regions="+CFG.REGION
    +"&markets=h2h,totals"
    +"&oddsFormat=decimal"
    +"&dateFormat=iso";

  try {
    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions:true });
    var code = resp.getResponseCode();
    if(code !== 200){
      Logger.log("OddsAPI ["+sportKey+"] HTTP "+code+": "+resp.getContentText().substr(0,200));
      return [];
    }
    var d = JSON.parse(resp.getContentText());
    if(!Array.isArray(d)){ Logger.log("OddsAPI: réponse non-array pour "+sportKey); return []; }

    // ── FILTRE : événements à venir uniquement (pas encore commencés) ──
    var now = Date.now();
    var horizon = now + CFG.WINDOW_H * 3600 * 1000;
    var filtered = d.filter(function(m){
      var t = new Date(m.commence_time).getTime();
      return t > now && t <= horizon;
    });

    Logger.log("OddsAPI ["+sportKey+"]: "+d.length+" total → "+filtered.length+" dans les "+CFG.WINDOW_H+"h");
    return filtered;
  } catch(e){
    Logger.log("fetchOdds ["+sportKey+"]: "+e);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════
//  GEMINI AI — Analyse de match
// ══════════════════════════════════════════════════════════════════
function geminiAnalyze(match) {
  var geminiKey = getSecret_("GEMINI_KEY");
  if(!geminiKey){
    return buildFallbackVerdict(match);
  }

  var cKey = "gemini_"+match.id;
  var cache = CacheService.getScriptCache();
  var hit = cache.get(cKey);
  if(hit){ try{ return JSON.parse(hit); }catch(e){} }

  var prompt = buildGeminiPrompt(match);

  try {
    var payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 600
      }
    };

    var resp = UrlFetchApp.fetch(
      CFG.GEMINI_URL + "?key=" + geminiKey,
      {
        method: "POST",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );

    if(resp.getResponseCode() !== 200){
      Logger.log("Gemini HTTP "+resp.getResponseCode()+": "+resp.getContentText().substr(0,300));
      return buildFallbackVerdict(match);
    }

    var raw = JSON.parse(resp.getContentText());
    var text = raw.candidates && raw.candidates[0] && raw.candidates[0].content
               && raw.candidates[0].content.parts && raw.candidates[0].content.parts[0]
               ? raw.candidates[0].content.parts[0].text : "";

    // Parser le JSON retourné par Gemini
    var clean = text.replace(/```json/g,"").replace(/```/g,"").trim();
    var result = JSON.parse(clean);

    try{ cache.put(cKey, JSON.stringify(result), CFG.CACHE_AI); }catch(e){}
    return result;

  } catch(e){
    Logger.log("Gemini error ["+match.id+"]: "+e);
    return buildFallbackVerdict(match);
  }
}

function buildGeminiPrompt(m) {
  var probs = m.probs || {};
  var value = m.value || {};
  var xg    = m.xg    || {};
  var trap  = m.trap  || {};

  return "Tu es un analyste sportif expert en paris. Analyse ce match et réponds UNIQUEMENT en JSON valide (aucun texte avant ou après).\n\n"
    + "Match: "+m.home+" vs "+m.away+"\n"
    + "Compétition: "+m.league+" ("+m.country+")\n"
    + "Date: "+m.time+"\n"
    + "Cotes réelles bookmakers: 1="+m.odds.h+" X="+m.odds.d+" 2="+m.odds.a+"\n"
    + "Probabilités Poisson: Dom="+Math.round((probs.h||0)*100)+"% Nul="+Math.round((probs.d||0)*100)+"% Ext="+Math.round((probs.a||0)*100)+"%\n"
    + "xG estimé: Dom="+xg.home+" Ext="+xg.away+"\n"
    + "Value bet: "+(value.detected?"OUI (+"+value.pct+"% sur "+(value.best==="h"?"Victoire dom":value.best==="a"?"Victoire ext":"Nul")+")":"NON")+"\n"
    + "Piège détecté: "+(trap.detected?"OUI ("+trap.sev+")":"NON")+"\n"
    + "Score prédit: "+m.prediction.home+"-"+m.prediction.away+" ("+m.prediction.pct+"%)\n\n"
    + "Retourne EXACTEMENT ce JSON:\n"
    + "{"
    + '"verdict":"VALUE"|"SAFE"|"AVOID"|"NEUTRAL",'
    + '"confidence":0-100,'
    + '"resume":"2 phrases max expliquant le contexte du match en français",'
    + '"conseil":"1 phrase de conseil de pari concis en français",'
    + '"risques":"1 phrase sur les risques principaux en français"'
    + "}";
}

function buildFallbackVerdict(match) {
  var v = match.value || {}, trap = match.trap || {};
  var verdict, confidence, resume, conseil, risques;

  if(v.detected && !trap.detected && v.pct > 8){
    verdict = "VALUE"; confidence = Math.min(75, 50 + v.pct);
    resume  = "Opportunité de value bet détectée sur ce match par l'algorithme Poisson.";
    conseil = "Miser sur "+(v.best==="h"?"la victoire à domicile":v.best==="a"?"la victoire à l'extérieur":"le match nul")+" à la cote "+(v.best?match.odds[v.best]:"—")+".";
    risques = "Analyse basée sur les cotes du marché, vérifiez les absences et l'actualité du match.";
  } else if(trap.detected && trap.sev==="HIGH"){
    verdict = "AVOID"; confidence = 70;
    resume  = "Un piège bookmaker de sévérité élevée a été détecté sur ce match.";
    conseil = "Éviter ce match, le marché présente des anomalies significatives.";
    risques = "Manipulation de marché possible, l'équipe favorite semble sur-cotée.";
  } else if(v.detected && trap.detected){
    verdict = "NEUTRAL"; confidence = 45;
    resume  = "Value bet potentielle mais contrebalancée par la présence d'un piège bookmaker.";
    conseil = "Attendre des informations supplémentaires avant de parier.";
    risques = "Signal mixte : value et piège simultanés augmentent l'incertitude.";
  } else {
    verdict = "NEUTRAL"; confidence = 40;
    resume  = "Aucune opportunité franche détectée, les cotes reflètent bien les probabilités estimées.";
    conseil = "Passer ce match ou jouer avec des mises minimales uniquement.";
    risques = "Marge bookmaker standard, ROI positif difficile à long terme sur ce type de match.";
  }
  return { verdict:verdict, confidence:confidence, resume:resume, conseil:conseil, risques:risques, fallback:true };
}

// ══════════════════════════════════════════════════════════════════
//  COLLECTE MATCHS — toutes ligues, cotes réelles
// ══════════════════════════════════════════════════════════════════
function getAllMatches() {
  var cKey = "all_matches_v6";
  var cache = CacheService.getScriptCache();
  var hit = cache.get(cKey);
  if(hit){ try{ return JSON.parse(hit); }catch(e){} }

  var all = [];
  for(var i=0; i<CFG.LEAGUES.length; i++){
    var lg  = CFG.LEAGUES[i];
    var raw = fetchOdds(lg.key);
    for(var j=0; j<raw.length; j++){
      var enriched = enrichMatch(raw[j], lg);
      if(enriched) all.push(enriched);
    }
  }

  if(all.length === 0){
    throw new Error("Aucun événement à venir dans les "+CFG.WINDOW_H+"h. L'Odds API ne retourne pas de données pour les ligues configurées.");
  }

  all.sort(function(a,b){ return new Date(a.time)-new Date(b.time); });
  Logger.log("Total matchs enrichis: "+all.length);
  try{ cache.put(cKey, JSON.stringify(all), CFG.CACHE_TTL); }catch(e){}
  return all;
}

function getLeagueMatches(leagueKey) {
  var all = getAllMatches();
  if(!leagueKey) return all;
  return all.filter(function(m){ return m.leagueKey===leagueKey; });
}

// ══════════════════════════════════════════════════════════════════
//  ENRICHISSEMENT — pipeline analytique
// ══════════════════════════════════════════════════════════════════
function enrichMatch(raw, lg) {
  if(!raw || !raw.bookmakers || raw.bookmakers.length === 0) return null;

  var odds  = extractOdds(raw.bookmakers, raw.home_team, raw.away_team);
  if(!odds.h || !odds.a) return null; // pas de cotes = inutilisable

  var xg    = computeXG(raw, lg, odds);
  var poi   = poissonMatrix(xg.home, xg.away);
  var probs = extractProbsFromPoisson(poi, raw.sport_key||"");
  var pred  = getMostLikelyScore(poi);
  var aisc  = computeAIScore(xg, probs, odds, raw);
  var value = computeValue(probs, odds);
  var trap  = detectTrap(raw, odds, probs);
  var safe  = computeSafeBets(odds, xg, probs, lg);

  return {
    id:         raw.id,
    leagueKey:  lg.key,
    league:     lg.name,
    country:    lg.country,
    flag:       lg.flag,
    home:       raw.home_team,
    away:       raw.away_team,
    time:       raw.commence_time,
    odds:       odds,        // ← cotes RÉELLES des bookmakers
    bookCount:  raw.bookmakers.length,
    books:      raw.bookmakers.slice(0,8).map(function(b){
                  return { name:b.title, odds:extractOdds([b], raw.home_team, raw.away_team) };
                }),
    xg:         xg,
    poisson:    poi,
    probs:      probs,
    prediction: pred,
    aiScore:    aisc,
    value:      value,
    trap:       trap,
    safeBets:   safe,
    risk:       riskLevel(aisc, trap)
  };
}

// ── Extraction des meilleures cotes par nom d'équipe ───────────────
function normalizeTeamName_(name) {
  return String(name||"").toLowerCase()
    .normalize("NFD").replace(/[\\u0300-\\u036f]/g,"")
    .replace(/[^a-z0-9]/g,"");
}

function outcomeSide_(name, homeTeam, awayTeam) {
  var n=normalizeTeamName_(name);
  if(!n) return "";
  if(n===normalizeTeamName_(homeTeam)||n==="home") return "h";
  if(n===normalizeTeamName_(awayTeam)||n==="away") return "a";
  if(n==="draw"||n==="tie"||n==="x"||n==="matchnul"||n==="nul") return "d";
  return "";
}

function extractOdds(bms, homeTeam, awayTeam) {
  var h=0, d=0, a=0, ov15=0, un15=0, ov25=0, un25=0;
  bms.forEach(function(bm){
    (bm.markets||[]).forEach(function(mkt){
      if(mkt.key==="h2h"){
        (mkt.outcomes||[]).forEach(function(o){
          var side=outcomeSide_(o.name,homeTeam,awayTeam);
          var price=Number(o.price)||0;
          if(side==="h"&&price>h) h=price;
          else if(side==="d"&&price>d) d=price;
          else if(side==="a"&&price>a) a=price;
        });
      }
      if(mkt.key==="totals"){
        (mkt.outcomes||[]).forEach(function(o){
          var point=Number(o.point), price=Number(o.price)||0;
          if(o.name==="Over"  && point===1.5 && price>ov15) ov15=price;
          if(o.name==="Under" && point===1.5 && price>un15) un15=price;
          if(o.name==="Over"  && point===2.5 && price>ov25) ov25=price;
          if(o.name==="Under" && point===2.5 && price>un25) un25=price;
        });
      }
    });
  });
  return { h:r2(h), d:r2(d), a:r2(a), over15:r2(ov15), under15:r2(un15), over25:r2(ov25), under25:r2(un25) };
}

// ══════════════════════════════════════════════════════════════════
//  MODÈLE xG
// ══════════════════════════════════════════════════════════════════
function fitGoalRates(odds, lg) {
  // Ajuste les deux intensités de buts aux probabilités 1X2 et au total
  // de buts du marché, après retrait de la marge du bookmaker.
  var ih=odds.h>1?1/odds.h:0, id=odds.d>1?1/odds.d:0, ia=odds.a>1?1/odds.a:0;
  var isum=ih+id+ia || 1;
  ih/=isum; id/=isum; ia/=isum;
  var hasTotals=odds.over25>1&&odds.under25>1;
  var io=hasTotals?1/odds.over25:0, iu=hasTotals?1/odds.under25:0;
  var osum=io+iu || 1, targetOver=hasTotals?io/osum:0;
  var best={home:Math.max(.2,(lg.avgGoals||2.7)*.54),away:Math.max(.2,(lg.avgGoals||2.7)*.46)};
  var bestLoss=Infinity;
  for(var h=0.2;h<=4.001;h+=0.1){
    var ph=[];for(var x=0;x<=8;x++)ph[x]=poissonProb(h,x);
    for(var a=0.2;a<=4.001;a+=0.1){
      var pa=[];for(var y=0;y<=8;y++)pa[y]=poissonProb(a,y);
      var mh=0,md=0,ma=0,under25=0;
      for(var x=0;x<=8;x++)for(var y=0;y<=8;y++){
        var p=ph[x]*pa[y];
        if(x>y)mh+=p;else if(x===y)md+=p;else ma+=p;
        if(x+y<=2)under25+=p;
      }
      var loss=(mh-ih)*(mh-ih)+(md-id)*(md-id)+(ma-ia)*(ma-ia);
      if(hasTotals){var over=1-under25;loss+=0.6*(over-targetOver)*(over-targetOver);}
      var prior=(h+a)-(lg.avgGoals||2.7);
      loss+=0.0025*prior*prior;
      if(loss<bestLoss){bestLoss=loss;best={home:h,away:a};}
    }
  }
  return best;
}

function computeXG(raw, lg, odds) {
  var fitted=fitGoalRates(odds,lg);
  // Les xG sont des taux estimés à partir des cotes, pas des statistiques de tirs.
  return {
    home:r2(fitted.home), away:r2(fitted.away),
    homeShots:0, awayShots:0, homePoss:0, awayPoss:0,
    homeAtk:r2(fitted.home/(lg.avgGoals||2.7)),
    homeDef:1,
    awayAtk:r2(fitted.away/(lg.avgGoals||2.7)),
    awayDef:1,
    source:"market-poisson"
  };
}

// ══════════════════════════════════════════════════════════════════
//  POISSON
// ══════════════════════════════════════════════════════════════════
function poissonProb(lambda, k) {
  if(lambda<=0) return k===0?1:0;
  var logP = -lambda + k * Math.log(lambda) - logFactorial(k);
  return Math.exp(logP);
}
function logFactorial(n) {
  if(n<=1) return 0;
  var s=0; for(var i=2;i<=n;i++) s+=Math.log(i); return s;
}
function poissonMatrix(lambdaH, lambdaA) {
  var MAX=6, matrix=[], totalP=0;
  for(var h=0; h<MAX; h++){
    matrix[h]=[];
    for(var a=0; a<MAX; a++){
      var p = poissonProb(lambdaH,h)*poissonProb(lambdaA,a);
      matrix[h][a]=r4(p); totalP+=p;
    }
  }
  if(totalP>0&&totalP<1){ for(var i=0;i<MAX;i++) for(var j=0;j<MAX;j++) matrix[i][j]=r4(matrix[i][j]/totalP); }
  return matrix;
}
function extractProbsFromPoisson(matrix, sportKey) {
  var pH=0, pD=0, pA=0, pBTTS=0, pOver25=0, pOver15=0;
  var MAX=matrix.length;
  for(var h=0; h<MAX; h++){
    for(var a=0; a<MAX; a++){
      var p=matrix[h][a]||0;
      if(h>a) pH+=p; else if(h===a) pD+=p; else pA+=p;
      if(h>0&&a>0) pBTTS+=p;
      if(h+a>2.5) pOver25+=p;
      if(h+a>1.5) pOver15+=p;
    }
  }
  if(sportKey.indexOf("basketball")>-1||sportKey.indexOf("tennis")>-1){
    var tot2=pH+pA||1; pH/=tot2; pA/=tot2; pD=0;
  }
  return { h:r3(pH), d:r3(pD), a:r3(pA), btts:r3(pBTTS), over25:r3(pOver25), over15:r3(pOver15) };
}
function getMostLikelyScore(matrix) {
  var best=0, bh=0, ba=0;
  for(var h=0; h<matrix.length; h++)
    for(var a=0; a<matrix[h].length; a++)
      if(matrix[h][a]>best){ best=matrix[h][a]; bh=h; ba=a; }
  return { home:bh, away:ba, prob:r3(best), pct:Math.round(best*100) };
}

// ══════════════════════════════════════════════════════════════════
//  AI SCORE
// ══════════════════════════════════════════════════════════════════
function computeAIScore(xg, probs, odds, raw) {
  var best = probs.h>=probs.a&&probs.h>=probs.d ? "h" : probs.a>=probs.d ? "a" : "d";
  var bestP = Math.max(probs.h||0, probs.d||0, probs.a||0);
  var matrix=poissonMatrix(xg.home||0,xg.away||0);
  var topProb=getMostLikelyScore(matrix).prob||0;
  var score=Math.round(cl((bestP*0.75+topProb*0.25)*100,0,100));
  return {
    score:score,
    label:score>=65?"STRONG MODEL SIGNAL":score>=50?"MODERATE MODEL SIGNAL":"LOW MODEL SIGNAL",
    confidence:score>=65?"HIGH":score>=50?"MEDIUM":"LOW",
    best:best,
    bestProb:r3(bestP)
  };
}

// ══════════════════════════════════════════════════════════════════
//  VALUE BET
// ══════════════════════════════════════════════════════════════════
function computeValue(probs, odds) {
  var res={};
  if(odds.h>1) res.h={ val:r3(probs.h*odds.h-1), trueP:probs.h, bookP:r3(1/odds.h), odds:odds.h };
  if(odds.d>1) res.d={ val:r3(probs.d*odds.d-1), trueP:probs.d, bookP:r3(1/odds.d), odds:odds.d };
  if(odds.a>1) res.a={ val:r3(probs.a*odds.a-1), trueP:probs.a, bookP:r3(1/odds.a), odds:odds.a };
  var best=null, bk=null;
  Object.keys(res).forEach(function(k){ if(!best||res[k].val>best.val){best=res[k];bk=k;} });
  return { detected:best&&best.val>0.04, pct:best?Math.round(best.val*1000)/10:0, best:bk, data:res };
}

// ══════════════════════════════════════════════════════════════════
//  TRAP DETECTION
// ══════════════════════════════════════════════════════════════════
function detectTrap(raw, odds, probs) {
  var list=[];
  if(odds.h>1&&odds.h<1.55&&probs.h<(1/odds.h)-0.10)
    list.push({type:"PUBLIC_FAVORITE",sev:"HIGH",label:"Piège favori public",
      desc:"Cote "+odds.h.toFixed(2)+" — IA "+Math.round(probs.h*100)+"% vs marché "+Math.round((1/odds.h)*100)+"%"});
  var bms=raw.bookmakers||[];
  if(bms.length>=3){
    var pr=[];
    bms.forEach(function(b){
      (b.markets||[]).forEach(function(m){
        if(m.key==="h2h"){
          (m.outcomes||[]).forEach(function(o){
            if(outcomeSide_(o.name,raw.home_team,raw.away_team)==="h"&&(Number(o.price)||0)>1)
              pr.push(Number(o.price));
          });
        }
      });
    });
    if(pr.length>=2){
      var mx=Math.max.apply(null,pr), mn=Math.min.apply(null,pr);
      if(mn>0&&(mx-mn)/mn>0.18)
        list.push({type:"ODDS_GAP",sev:"MEDIUM",label:"Écart de cotes",
          desc:"Désaccord "+(Math.round((mx-mn)/mn*100))+"% entre bookmakers"});
    }
  }
  if(odds.h>1&&odds.h<1.30)
    list.push({type:"EXTREME_FAV",sev:"MEDIUM",label:"Favori extrême",desc:"Cote "+odds.h.toFixed(2)+" — ROI très limité"});
  return { detected:list.length>0, list:list, sev:list.length?list[0].sev:"NONE" };
}

// ══════════════════════════════════════════════════════════════════
//  SAFE BETS
// ══════════════════════════════════════════════════════════════════
function computeSafeBets(odds, xg, probs, lg) {
  var safe=[], totalXG=xg.home+xg.away;
  // Seuls les marchés fournis réellement par The Odds API sont affichés.
  if(probs.over15>=0.68&&odds.over15>1.05){
    safe.push({type:"OVER_1_5",label:"Over 1.5 buts",icon:"⚽",
      confidence:Math.round(probs.over15*100),odds:odds.over15,
      risk:probs.over15>=0.82?"LOW":"MEDIUM",
      desc:"xG modèle total: "+totalXG+" | Probabilité Poisson: "+Math.round(probs.over15*100)+"%"});
  }
  if(probs.over25>=0.54&&odds.over25>1.20){
    safe.push({type:"OVER_2_5",label:"Over 2.5 buts",icon:"🔥",
      confidence:Math.round(probs.over25*100),odds:odds.over25,
      risk:probs.over25>=0.65?"LOW":"MEDIUM",
      desc:"xG modèle domicile: "+xg.home+" extérieur: "+xg.away+" | Probabilité Poisson: "+Math.round(probs.over25*100)+"%"});
  }
  return safe;
}
function riskLevel(ai, trap) {
  if(trap.detected&&trap.sev==="HIGH") return "HIGH";
  if(ai.score>=80&&!trap.detected) return "LOW";
  if(ai.score>=65) return "MEDIUM";
  return "HIGH";
}

// ══════════════════════════════════════════════════════════════════
//  ANALYSE DÉTAILLÉE avec Gemini
// ══════════════════════════════════════════════════════════════════
function getMatchAnalysis(matchId) {
  var all = getAllMatches();
  var m = null;
  for(var i=0;i<all.length;i++) if(all[i].id===matchId){ m=all[i]; break; }
  if(!m) throw new Error("Match introuvable (id: "+matchId+")");

  // Appel Gemini pour le verdict IA
  var gemini = geminiAnalyze(m);

  // Aucun historique H2H n'est fourni par la source de cotes utilisée.
  return { match:m, gemini:gemini, h2h:{available:false,note:"Historique direct indisponible : aucune source H2H connectée."} };
}

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════════
function getDashboard() {
  var all   = getAllMatches();
  var vbs   = all.filter(function(m){return m.value&&m.value.detected;});
  var traps = all.filter(function(m){return m.trap&&m.trap.detected;});
  var sbAll = [];
  all.forEach(function(m){ (m.safeBets||[]).forEach(function(sb){ sbAll.push({match:m,bet:sb}); }); });
  sbAll.sort(function(a,b){return b.bet.confidence-a.bet.confidence;});
  var avgROI = vbs.length ? r2(vbs.reduce(function(s,m){return s+(m.value.pct||0);},0)/vbs.length) : 0;
  var byLeague={};
  all.forEach(function(m){
    var l=m.league;
    if(!byLeague[l]) byLeague[l]={league:l,flag:m.flag,key:m.leagueKey,matches:[]};
    byLeague[l].matches.push(m);
  });
  return {
    totalMatches: all.length,
    valueBets:    vbs.length,
    traps:        traps.length,
    safeBetsCount:sbAll.length,
    avgROI:       avgROI,
    topAI:        all.slice().sort(function(a,b){return b.aiScore.score-a.aiScore.score;}).slice(0,6),
    topValueBets: vbs.sort(function(a,b){return b.value.pct-a.value.pct;}).slice(0,8),
    topSafeBets:  sbAll.slice(0,8),
    allMatches:   all,
    byLeague:     Object.keys(byLeague).map(function(k){return byLeague[k];}),
    window:       CFG.WINDOW_H,
    ts:           new Date().toISOString()
  };
}

function getValueScanner() {
  var all = getAllMatches();
  var vbs = all.filter(function(m){return m.value&&m.value.detected;}).sort(function(a,b){return b.value.pct-a.value.pct;});
  return { total:vbs.length, matches:vbs };
}

function getSafeBets() {
  var all=getAllMatches(), flat=[];
  all.forEach(function(m){ (m.safeBets||[]).forEach(function(sb){ flat.push({match:m,bet:sb}); }); });
  flat.sort(function(a,b){return b.bet.confidence-a.bet.confidence;});
  return { total:flat.length, bets:flat };
}

// ══════════════════════════════════════════════════════════════════
//  ADMIN
// ══════════════════════════════════════════════════════════════════
function adminStats_() {
  var rows=getSheet(CFG.SHEETS.users).getDataRange().getValues().slice(1);
  var p=rows.filter(function(r){return r[4]==="premium";}).length;
  return { total:rows.length, premium:p, free:rows.length-p,
    disabled:rows.filter(function(r){return r[8]===true||r[8]==="TRUE";}).length,
    revenue:(p*9.99).toFixed(2) };
}
function adminUsers_() {
  return getSheet(CFG.SHEETS.users).getDataRange().getValues().slice(1).map(function(r){
    return { id:r[0], email:r[1], name:r[3], plan:r[4]||"free", created:r[6], lastLogin:r[7], disabled:r[8]===true||r[8]==="TRUE" };
  });
}
function adminDisable_(userId, disabled) {
  var sh=getSheet(CFG.SHEETS.users), rows=sh.getDataRange().getValues();
  for(var i=1;i<rows.length;i++) if(rows[i][0]===userId){ sh.getRange(i+1,9).setValue(disabled); return{done:true}; }
  throw new Error("User not found");
}

// ══════════════════════════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════════════════════════
function r2(n){return Math.round(n*100)/100;}
function r3(n){return Math.round(n*1000)/1000;}
function r4(n){return Math.round(n*10000)/10000;}
function cl(n,mn,mx){return Math.max(mn,Math.min(mx,n));}
function hs(s){var h=0;for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h=h&h;}return Math.abs(h);}

// ── Test runner ─────────────────────────────────────────────────
function testSetup(){
  Logger.log("=== OddsLab v6 TEST ===");
  Logger.log("Gemini configuré: "+(getSecret_("GEMINI_KEY")?"OUI":"NON — définir la propriété GEMINI_KEY (Gemini est facultatif)."));
  try {
    var matches = getAllMatches();
    Logger.log("Matchs chargés: "+matches.length);
    if(matches.length>0){
      var m = matches[0];
      Logger.log("Premier match: "+m.home+" vs "+m.away+" | "+m.time);
      Logger.log("Cotes réelles: 1="+m.odds.h+" X="+m.odds.d+" 2="+m.odds.a);
      Logger.log("Value: "+m.value.detected+" ("+m.value.pct+"%) | Trap: "+m.trap.detected);
      var analysis = getMatchAnalysis(m.id);
      Logger.log("Gemini verdict: "+analysis.gemini.verdict+" ("+analysis.gemini.confidence+"%)");
      Logger.log("Gemini fallback: "+(analysis.gemini.fallback||false));
    }
  } catch(e) {
    Logger.log("ERREUR: "+e);
  }
}
