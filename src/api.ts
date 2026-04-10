import { churchService, Church } from "./services/churchService";
import { db } from "./firebase";
import { collection, getDocs, query, where, doc, setDoc, updateDoc, getDoc, deleteDoc } from "firebase/firestore";

export { type Church };

export const api = {
  async getChurches(): Promise<Church[]> {
    return churchService.getChurches();
  },

  async addChurch(church: Omit<Church, "id">): Promise<Church> {
    return churchService.addChurch(church);
  },

  async updateChurch(id: string, church: Partial<Church>): Promise<Church> {
    return churchService.updateChurch(id, church);
  },

  async deleteChurch(id: string): Promise<void> {
    return churchService.deleteChurch(id);
  },

  async getUserProfile(uid: string): Promise<any> {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  },

  async createUserProfile(profile: any): Promise<any> {
    const docRef = doc(db, "users", profile.id);
    await setDoc(docRef, profile);
    return profile;
  },

  async updateUserProfile(uid: string, profile: any): Promise<any> {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, profile);
    return profile;
  },

  async uploadImage(file: File): Promise<string> {
    // Implement Firebase Storage version
    return "";
  },

  async seedData(churches: any[]): Promise<void> {
    // Implement Firestore version
  },

  async getEntities(entity: string, churchId?: string): Promise<any[]> {
    const colRef = collection(db, entity);
    let q = query(colRef);
    if (churchId) {
      q = query(colRef, where("churchId", "==", churchId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  async addEntity(entity: string, data: any): Promise<any> {
    try {
      const colRef = collection(db, entity);
      const docRef = doc(colRef);
      await setDoc(docRef, { ...data, id: docRef.id });
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error(`Error adding entity to ${entity}:`, error);
      throw error;
    }
  },

  async updateEntity(entity: string, id: string, data: any): Promise<any> {
    const docRef = doc(db, entity, id);
    await updateDoc(docRef, data);
    return { id, ...data };
  },

  async deleteEntity(entity: string, id: string): Promise<void> {
    const docRef = doc(db, entity, id);
    await deleteDoc(docRef);
  },
};
