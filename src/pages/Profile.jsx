// src/pages/Profile.jsx
//
// Lets the user update their profile: display name, photo, email, password.
// Photo is stored as a base64 string directly in Firestore (no Firebase
// Storage needed — keeps everything on the free Spark plan).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  updateProfile, updateEmail, updatePassword,
  reauthenticateWithCredential, EmailAuthProvider,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const MAX_PHOTO_BYTES = 300 * 1024; // ~300KB after compression, fits comfortably in a Firestore field

export default function Profile() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [photoPreview, setPhotoPreview] = useState(profile?.photoURL || null);
  const [photoFile, setPhotoFile] = useState(null);

  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [messages, setMessages] = useState({ profile: null, email: null, password: null });

  function setMsg(section, type, text) {
    setMessages((prev) => ({ ...prev, [section]: { type, text } }));
    setTimeout(() => setMessages((prev) => ({ ...prev, [section]: null })), 4000);
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMsg("profile", "error", "Image too large. Please choose a file under 2MB.");
      return;
    }

    // Compress via canvas before storing as base64
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 200;
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = (height * maxDim) / width;
          width = maxDim;
        } else if (height > maxDim) {
          width = (width * maxDim) / height;
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setPhotoPreview(dataUrl);
        setPhotoFile(dataUrl);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updates = {};
      if (displayName.trim() && displayName !== profile?.displayName) {
        updates.displayName = displayName.trim();
      }
      if (photoFile) {
        updates.photoURL = photoFile;
      }

      if (Object.keys(updates).length > 0) {
        await updateProfile(auth.currentUser, {
          displayName: updates.displayName || profile?.displayName,
          ...(updates.photoURL && photoFile.length < MAX_PHOTO_BYTES
            ? {} // Firebase Auth photoURL has a length limit, so we only store the
                 // compressed image in Firestore, not in the Auth profile itself.
            : {}),
        });
        await updateDoc(doc(db, "users", user.uid), updates);
      }
      setMsg("profile", "success", "Profile updated successfully!");
      setPhotoFile(null);
    } catch (err) {
      setMsg("profile", "error", err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangeEmail(e) {
    e.preventDefault();
    if (!currentPasswordForEmail) {
      setMsg("email", "error", "Please enter your current password to confirm.");
      return;
    }
    setSavingEmail(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPasswordForEmail);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updateEmail(auth.currentUser, newEmail);
      await updateDoc(doc(db, "users", user.uid), { email: newEmail });
      setMsg("email", "success", "Email updated successfully!");
      setCurrentPasswordForEmail("");
    } catch (err) {
      setMsg("email", "error", friendlyError(err.code) || err.message);
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMsg("password", "error", "New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg("password", "error", "Passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setMsg("password", "success", "Password changed successfully!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      setMsg("password", "error", friendlyError(err.code) || err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  const isGoogleUser = user?.providerData?.some((p) => p.providerId === "google.com");

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/")}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
      >
        ← Back to Home
      </button>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h2>

      {/* Profile photo + display name */}
      <section className="bg-white rounded-xl shadow-sm p-6 mb-5">
        <h3 className="font-semibold text-gray-800 mb-4">Profile Information</h3>

        {messages.profile && <Banner msg={messages.profile} />}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-primary-100" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-600">
                  {displayName?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 bg-primary-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs cursor-pointer hover:bg-primary-800">
                📷
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="bg-primary-600 hover:bg-primary-800 text-white font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </section>

      {/* Email change — only for email/password users */}
      {!isGoogleUser && (
        <section className="bg-white rounded-xl shadow-sm p-6 mb-5">
          <h3 className="font-semibold text-gray-800 mb-4">Change Email</h3>
          {messages.email && <Banner msg={messages.email} />}
          <form onSubmit={handleChangeEmail} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Email</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input type="password" value={currentPasswordForEmail} onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                placeholder="Confirm with your current password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400" />
            </div>
            <button type="submit" disabled={savingEmail}
              className="bg-primary-600 hover:bg-primary-800 text-white font-medium px-4 py-2 rounded-lg transition disabled:opacity-50">
              {savingEmail ? "Updating..." : "Update Email"}
            </button>
          </form>
        </section>
      )}

      {/* Password change — only for email/password users */}
      {!isGoogleUser && (
        <section className="bg-white rounded-xl shadow-sm p-6 mb-5">
          <h3 className="font-semibold text-gray-800 mb-4">Change Password</h3>
          {messages.password && <Banner msg={messages.password} />}
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400" />
            </div>
            <button type="submit" disabled={savingPassword}
              className="bg-primary-600 hover:bg-primary-800 text-white font-medium px-4 py-2 rounded-lg transition disabled:opacity-50">
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>
      )}

      {isGoogleUser && (
        <div className="bg-blue-50 text-blue-600 text-sm rounded-xl p-4 text-center">
          You signed in with Google. Email and password are managed through your Google account.
        </div>
      )}
    </div>
  );
}

function Banner({ msg }) {
  return (
    <div className={`text-sm rounded-lg p-3 mb-4 ${
      msg.type === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
    }`}>
      {msg.text}
    </div>
  );
}

function friendlyError(code) {
  const map = {
    "auth/wrong-password": "Incorrect current password.",
    "auth/invalid-credential": "Incorrect current password.",
    "auth/email-already-in-use": "That email is already in use.",
    "auth/requires-recent-login": "Please sign out and sign in again, then retry.",
    "auth/weak-password": "Password is too weak.",
  };
  return map[code];
}
