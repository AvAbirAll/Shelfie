
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  updateDoc
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// 🔥 Firebase config (kept same - user must already have it)
const firebaseConfig = window.firebaseConfig || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function App() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("General");
  const [categories, setCategories] = useState(["General"]);
  const [editing, setEditing] = useState(null);

  // 🔐 Google Auth (UNCHANGED)
  const login = async () => {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    setUser(res.user);
  };

  // 📦 Load data
  const loadProducts = async (uid) => {
    const snap = await getDocs(collection(db, "users", uid, "products"));
    const data = snap.docs.map(d => d.data());
    setProducts(data);
  };

  useEffect(() => {
    if (user) loadProducts(user.uid);
  }, [user]);

  // ➕ Add or Update product
  const saveProduct = async () => {
    if (!name || !price) return alert("Missing fields");

    const duplicate = products.find(
      p => p.name === name && p.price === price
    );

    if (duplicate && !editing) {
      if (!window.confirm("Duplicate found. Replace?")) return;
      setEditing(duplicate);
    }

    const id = editing ? editing.id : crypto.randomUUID();

    const product = {
      id,
      name,
      price,
      category,
      updatedAt: Date.now()
    };

    await setDoc(doc(db, "users", user.uid, "products", id), product);

    // 🗓️ Save history
    await setDoc(
      doc(db, "users", user.uid, "history", crypto.randomUUID()),
      {
        productId: id,
        data: product,
        date: new Date().toISOString()
      }
    );

    setName("");
    setPrice("");
    setEditing(null);
    loadProducts(user.uid);
  };

  // ✏️ Edit
  const editProduct = (p) => {
    setEditing(p);
    setName(p.name);
    setPrice(p.price);
    setCategory(p.category);
  };

  // ➕ Add Category
  const addCategory = () => {
    const c = prompt("New category name");
    if (c && !categories.includes(c)) {
      setCategories([...categories, c]);
    }
  };

  // 🔍 Smart Lens (basic demo)
  const smartLens = async (file) => {
    alert("Smart Lens scanning... (demo)");
  };

  if (!user) {
    return <button onClick={login}>Login with Google</button>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Inventory</h2>

      <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} />

      <select value={category} onChange={e => setCategory(e.target.value)}>
        {categories.map(c => <option key={c}>{c}</option>)}
      </select>

      <button onClick={addCategory}>+ Category</button>
      <button onClick={saveProduct}>
        {editing ? "Update" : "Add"}
      </button>

      <hr />

      {products.map(p => (
        <div key={p.id}>
          {p.name} - {p.price} ({p.category})
          <button onClick={() => editProduct(p)}>Edit</button>
        </div>
      ))}

      <hr />

      <h3>Smart Lens</h3>
      <input type="file" onChange={e => smartLens(e.target.files[0])} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
