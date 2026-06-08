import { useState, useEffect } from "react";
import { EyeOff, Eye } from "lucide-react";
import { useAuth } from "../context/AuthContextHook";
import myAccountApi from "../services/api/myaccount";
import toast from "react-hot-toast";

function PasswordField({ label, value, onChange, name }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-6">
      <label className="block text-[13px] text-slate-500 font-medium mb-1.5 ml-0.5">
        {label}
      </label>
      <div className="flex">
        <input
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          className="flex-1 px-4 py-2.5 text-[14px] bg-[#f8f9fa] dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-l text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
        />
        <button
          type="button"
          onClick={() => setShow((p) => !p)}
          className="px-4 py-2.5 bg-[#6c5ce7] hover:bg-[#5f51cd] text-white rounded-r flex items-center justify-center transition-colors"
        >
          {show ? <Eye size={18} strokeWidth={2} /> : <EyeOff size={18} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, name, required = false }) {
  return (
    <div className="mb-6">
      <label className="block text-[13px] text-slate-500 font-medium mb-1.5 ml-0.5">
        {label} {required && <span>*</span>}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2.5 text-[14px] font-medium bg-[#f8f9fa] dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-200"
      />
    </div>
  );
}

export default function MyAccountPage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("Personal info");

  // ── Personal Info State ──────────────────────────────
  const [profileForm, setProfileForm] = useState({
    userName: "",
    name: "",
    surname: "",
    email: "",
    phoneNumber: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profilePic, setProfilePic] = useState(() => localStorage.getItem(`profile_pic_${user?.id}`) || "");

  // ── Change Password State ────────────────────────────
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const tabs = ["Change password", "Personal info"];

  // ── GET profile on mount ─────────────────────────────
  useEffect(() => {
    myAccountApi
      .getMyProfile()
      .then((data) => {
        setProfileForm({
          userName: data.userName || data.username || "",
          name: data.name ?? "",
          surname: data.surname ?? "",
          email: data.email ?? "",
          phoneNumber: data.phoneNumber ?? "",
        });
      })
      .catch(() => toast.error("Failed to load profile"));
  }, []);

  // ── Handlers ─────────────────────────────────────────
  const handleProfileChange = (e) => {
    setProfileForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setProfileError("");
    setProfileSuccess("");
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setProfilePic(base64String);
        if (user?.id) {
          localStorage.setItem(`profile_pic_${user.id}`, base64String);
          if (updateUser) updateUser({ customAvatar: base64String });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePic = () => {
    setProfilePic("");
    if (user?.id) {
      localStorage.removeItem(`profile_pic_${user.id}`);
      if (updateUser) updateUser({ customAvatar: null });
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setPasswordError("");
    setPasswordSuccess("");
  };

  // ── PUT update profile ────────────────────────────────
  const handleProfileSubmit = async () => {
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      await myAccountApi.updateMyProfile(profileForm);
      setProfileSuccess("Profile updated successfully");
      toast.success("Profile updated successfully");
    } catch (err) {
      const msg = err.response?.data?.error?.message || "Failed to update profile";
      setProfileError(msg);
      toast.error("Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  // ── POST change password ──────────────────────────────
  const handlePasswordSubmit = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }
    setPasswordLoading(true);
    try {
      await myAccountApi.changePassword(passwordForm);
      setPasswordSuccess("Password changed successfully");
      toast.success("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      const msg = err.response?.data?.error?.message || "Failed to change password";
      setPasswordError(msg);
      toast.error("Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial]">
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>

      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl">
        {/* Header */}
        <div className="flex flex-col gap-2 py-8 px-4 md:px-8 border-b border-slate-100 dark:border-slate-800/50">
          <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1">
            <span>Home</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-pink-500">My Account</span>
          </nav>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">My Account</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-6 lg:gap-14 p-8 lg:p-10 flex-1">

          {/* Left Sidebar */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-5 py-3 rounded-lg text-[14px] font-medium transition-colors ${isActive
                      ? "bg-[#ffebf3] dark:bg-pink-500/10 text-[#ec4899]"
                      : "bg-[#f8f9fa] dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Right Content Area */}
          <div className="flex-1 w-full max-w-3xl">

            {/* ── Change Password Tab ── */}
            {activeTab === "Change password" && (
              <div className="animate-in fade-in duration-300">
                <h1 className="text-[28px] font-medium text-slate-600 dark:text-slate-300 mb-6">
                  Change password
                </h1>
                <hr className="border-slate-100 dark:border-slate-800 mb-6" />
                <h2 className="text-[20px] font-medium text-slate-500 dark:text-slate-400 mb-8">
                  Change password
                </h2>

                <div className="max-w-2xl">
                  <PasswordField
                    label="Current password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                  />
                  <PasswordField
                    label="New password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                  />
                  <PasswordField
                    label="Confirm new password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                  />

                  <div className="pt-2">
                    {passwordError && (
                      <div className="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-200 dark:border-red-500/20">
                        {passwordError}
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="mb-4 text-sm text-green-600 bg-green-50 dark:bg-green-500/10 p-3 rounded-lg border border-green-200 dark:border-green-500/20">
                        {passwordSuccess}
                      </div>
                    )}
                    <button
                      onClick={handlePasswordSubmit}
                      disabled={passwordLoading}
                      className="px-6 py-2.5 bg-[#3b82f6] hover:bg-blue-600 text-white rounded font-semibold text-[14px] tracking-wide active:scale-95 transition-all outline-none disabled:opacity-60"
                    >
                      {passwordLoading ? "Saving..." : "Submit"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Personal Info Tab ── */}
            {activeTab === "Personal info" && (
              <div className="animate-in fade-in duration-300">
                <h1 className="text-[28px] font-medium text-slate-600 dark:text-slate-300 mb-6">
                  Personal info
                </h1>
                <hr className="border-slate-100 dark:border-slate-800 mb-6" />
                <h2 className="text-[20px] font-medium text-slate-500 dark:text-slate-400 mb-8">
                  Personal settings
                </h2>

                <div className="max-w-2xl">
                  {/* Profile Picture Uploader */}
                  <div className="mb-8 flex items-center gap-6">
                    <div className="relative group w-24 h-24 rounded-full shadow-md overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border-2 border-slate-200 dark:border-slate-700">
                      {profilePic ? (
                        <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-slate-400">{user?.avatar || "U"}</span>
                      )}
                      <label className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity backdrop-blur-[2px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Change</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicChange} />
                      </label>
                    </div>
                    <div className="flex flex-col items-start gap-2.5">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{user?.name || profileForm.name || "User"}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Update your photo and personal details.</p>
                      </div>
                      {profilePic && (
                        <button
                          type="button"
                          onClick={handleRemoveProfilePic}
                          className="text-[11px] font-bold uppercase tracking-wider text-red-500 hover:text-red-600 transition-colors bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 px-3 py-1.5 rounded-md"
                        >
                          Remove picture
                        </button>
                      )}
                    </div>
                  </div>

                  <InputField
                    label="Username"
                    name="userName"
                    value={profileForm.userName}
                    onChange={handleProfileChange}
                    required
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InputField
                      label="Name"
                      name="name"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                    />
                    <InputField
                      label="Surname"
                      name="surname"
                      value={profileForm.surname}
                      onChange={handleProfileChange}
                    />
                  </div>

                  <InputField
                    label="Email"
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    required
                  />
                  <InputField
                    label="Phone number"
                    name="phoneNumber"
                    value={profileForm.phoneNumber}
                    onChange={handleProfileChange}
                  />

                  <div className="pt-2">
                    {profileError && (
                      <div className="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-200 dark:border-red-500/20">
                        {profileError}
                      </div>
                    )}
                    {profileSuccess && (
                      <div className="mb-4 text-sm text-green-600 bg-green-50 dark:bg-green-500/10 p-3 rounded-lg border border-green-200 dark:border-green-500/20">
                        {profileSuccess}
                      </div>
                    )}
                    <button
                      onClick={handleProfileSubmit}
                      disabled={profileLoading}
                      className="px-6 py-2.5 bg-[#3b82f6] hover:bg-blue-600 text-white rounded font-semibold text-[14px] tracking-wide active:scale-95 transition-all outline-none disabled:opacity-60"
                    >
                      {profileLoading ? "Saving..." : "Submit"}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}