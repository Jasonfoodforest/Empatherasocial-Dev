import { auth, db, storage } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

const ui = {
  chatList: document.getElementById('chatList'),
  groupList: document.getElementById('groupList'),
  messages: document.getElementById('messages'),
  messageInput: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
  activeTitle: document.getElementById('activeTitle'),
  err: document.getElementById('err')
};

let me = null;
let unsubMsgs = null;
let active = { type:null, chatKey:null, groupId:null, members:[] };

const chatKey = (a,b) => [a,b].sort((x,y)=>x.localeCompare(y)).join("_");

function showErr(e){ console.error(e); ui.err.textContent = e?.message || String(e); }

onAuthStateChanged(auth, async (u)=>{
  if(!u){ location.replace("./index.html"); return; }
  me = { uid:u.uid, email:u.email||"" };
  loadChats();
  loadGroups();
});

function loadChats(){
  const qChats = query(
    collection(db,"chats"),
    where("participants","array-contains", me.email),
    orderBy("lastAt","desc")
  );
  onSnapshot(qChats,(snap)=>{
    ui.chatList.innerHTML = "";
    snap.forEach(docSnap=>{
      const d = docSnap.data();
      const other = (d.participants||[]).find(p=>p!==me.email) || "(unknown)";
      const btn = document.createElement("button");
      btn.className = "pill";
      btn.textContent = other;
      btn.onclick = ()=>openDirect(other);
      ui.chatList.appendChild(btn);
    });
  }, showErr);
}

function loadGroups(){
  const qGroups = query(collection(db,"groups"));
  onSnapshot(qGroups,(snap)=>{
    ui.groupList.innerHTML = "";
    snap.forEach(docSnap=>{
      const d = docSnap.data();
      const btn = document.createElement("button");
      btn.className = "pill";
      btn.textContent = (d.name||"Group")+" ("+(d.members?.length||0)+" members)";
      btn.onclick = ()=>openGroup(docSnap.id, d.members||[]);
      ui.groupList.appendChild(btn);
    });
  }, showErr);
}

function openDirect(peerEmail){
  active = { type:"direct", chatKey: chatKey(me.email, peerEmail), groupId:null, members:[me.email, peerEmail] };
  ui.activeTitle.textContent = peerEmail;
  bindMessages("messages", active.chatKey);   // messages/{chatKey}/chats/*
}

function openGroup(groupId, members){
  active = { type:"group", chatKey:null, groupId, members };
  ui.activeTitle.textContent = `${members.length} members`;
  bindMessages("groupMessages", groupId);     // groupMessages/{groupId}/items/*
}

function bindMessages(kind, id){
  if (unsubMsgs) unsubMsgs();
  ui.messages.innerHTML = "";
  const sub = (kind === "messages") ? "chats" : "items";
  const q = query(collection(db, kind, id, sub), orderBy("createdAt","asc"));
  unsubMsgs = onSnapshot(q,(snap)=>{
    ui.messages.innerHTML = "";
    snap.forEach(d=>{
      const m = d.data();
      const div = document.createElement("div");
      div.className = "msg";
      div.textContent = `${m.senderEmail||m.sender||"anon"}: ${m.text||""}`;
      ui.messages.appendChild(div);
    });
  }, showErr);
}

ui.sendBtn.onclick = async ()=>{
  if(!active.type){ showErr({message:"Pick a chat first"}); return; }
  const text = (ui.messageInput.value||"").trim();
  if(!text){ return; }
  ui.err.textContent = "";
  try{
    const base = active.type==="direct"
      ? collection(db,"messages", active.chatKey, "chats")
      : collection(db,"groupMessages", active.groupId, "items");

    await addDoc(base, {
      text, senderEmail: me.email, createdAt: serverTimestamp()
    });
    ui.messageInput.value = "";
  }catch(e){ showErr(e); }
};

