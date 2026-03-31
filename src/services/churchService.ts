import { db } from "../firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";

export interface Church {
  id: string;
  name: string;
  region: string;
  district: string;
  address: string;
  location: { lat: number; lng: number };
  contact: string;
  images: string[];
}

const churchesCollection = collection(db, "churches");

export const churchService = {
  async getChurches(): Promise<Church[]> {
    const snapshot = await getDocs(churchesCollection);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Church));
  },

  async addChurch(church: Omit<Church, "id">): Promise<Church> {
    const docRef = await addDoc(churchesCollection, church);
    return { id: docRef.id, ...church };
  },

  async updateChurch(id: string, church: Partial<Church>): Promise<Church> {
    const docRef = doc(db, "churches", id);
    await updateDoc(docRef, church);
    return { id, ...church } as Church;
  },

  async deleteChurch(id: string): Promise<void> {
    const docRef = doc(db, "churches", id);
    await deleteDoc(docRef);
  },
};
