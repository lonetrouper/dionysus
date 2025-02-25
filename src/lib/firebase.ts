// Import the functions you need from the SDKs you need
import { promises } from "dns";
import { initializeApp } from "firebase/app";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWNmk99PXsKhwiJBy6YLDsU5-IqI2gnGk",
  authDomain: "dionysus-1ae31.firebaseapp.com",
  projectId: "dionysus-1ae31",
  storageBucket: "dionysus-1ae31.firebasestorage.app",
  messagingSenderId: "927790252555",
  appId: "1:927790252555:web:f55da62c3be7ce1a19fd0e",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

export const uploadFile = async (
  file: File,
  setProgress?: (progress: number) => void,
) => {
  return new Promise((resolve, reject) => {
    try {
      const storageRef = ref(storage, file.name);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (setProgress) {
            setProgress(progress);
          }
          switch (snapshot.state) {
            case "paused":
              console.log("Upload is paused");
              break;
            case "running":
              console.log("Upload is running");
              break;
          }
        },
        (error) => {
          reject(error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            resolve(downloadURL);
          });
        },
      );
    } catch (error) {
      console.error(error);
      reject(error);
    }
  });
};
