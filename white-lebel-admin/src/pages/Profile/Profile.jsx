import React, { useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Save,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";

import { api } from "../../api/axios";
import { logoutMasterAdmin } from "../../features/auth/authSlice";
import { selectMasterAdmin } from "../../features/auth/authSelectors";

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const admin = useSelector(selectMasterAdmin);

  const [formData, setFormData] = useState({
    email: admin?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [show, setShow] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      formData.email.trim() &&
      formData.currentPassword.trim() &&
      (!formData.newPassword || formData.newPassword.length >= 6) &&
      formData.newPassword === formData.confirmPassword
    );
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleShow = (field) => {
    setShow((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleLogoutAfterUpdate = () => {
    dispatch(logoutMasterAdmin());
    navigate("/login", { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      return toast.error("Email is required");
    }

    if (!formData.currentPassword.trim()) {
      return toast.error("Current password is required");
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      return toast.error("New password must be at least 6 characters");
    }

    if (formData.newPassword !== formData.confirmPassword) {
      return toast.error("New password and confirm password do not match");
    }

    try {
      setLoading(true);

      await api.patch("/api/master/auth/update-profile", {
        email: formData.email.trim(),
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword || "",
      });

      toast.success("Profile updated successfully. Please login again.");
      handleLogoutAfterUpdate();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-white">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.20),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_35%)]" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
              <UserCircle className="h-10 w-10" />
            </div>

            <h1 className="text-3xl font-black md:text-4xl">
              Master{" "}
              <span className="bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-transparent">
                Profile
              </span>
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              Update master admin email or password. After successful update,
              you will be logged out automatically.
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-7 w-7 text-cyan-300" />
              <div>
                <p className="text-sm font-black text-cyan-100">
                  Secure Profile
                </p>
                <p className="text-xs text-cyan-200/80">
                  Current password required
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl md:p-7"
      >
        <div className="mb-6 flex items-center gap-4 rounded-3xl border border-white/10 bg-black/25 p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
            <UserCircle className="h-8 w-8" />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-black">
              {admin?.name || "Master Admin"}
            </h2>
            <p className="truncate text-sm text-slate-400">
              {admin?.email || "No email found"}
            </p>
          </div>
        </div>

        <div className="grid gap-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-200">
              New Email
            </label>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 focus-within:border-cyan-300/60">
              <Mail className="h-5 w-5 text-cyan-300" />

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@example.com"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <PasswordInput
            label="Current Password"
            name="currentPassword"
            value={formData.currentPassword}
            show={show.currentPassword}
            onChange={handleChange}
            onToggle={() => toggleShow("currentPassword")}
            placeholder="Enter current password"
          />

          <PasswordInput
            label="New Password"
            name="newPassword"
            value={formData.newPassword}
            show={show.newPassword}
            onChange={handleChange}
            onToggle={() => toggleShow("newPassword")}
            placeholder="Leave blank if you do not want to change"
          />

          <PasswordInput
            label="Confirm New Password"
            name="confirmPassword"
            value={formData.confirmPassword}
            show={show.confirmPassword}
            onChange={handleChange}
            onToggle={() => toggleShow("confirmPassword")}
            placeholder="Confirm new password"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 px-5 py-3.5 text-sm font-black text-white shadow-[0_18px_50px_rgba(34,211,238,0.20)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-5 w-5" />
          {loading ? "Updating..." : "Update Profile"}
        </button>
      </form>
    </div>
  );
};

const PasswordInput = ({
  label,
  name,
  value,
  show,
  onChange,
  onToggle,
  placeholder,
}) => {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-200">
        {label}
      </label>

      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 focus-within:border-emerald-300/60">
        <Lock className="h-5 w-5 text-emerald-300" />

        <input
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
        />

        <button
          type="button"
          onClick={onToggle}
          className="cursor-pointer text-slate-300 hover:text-white"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
};

export default Profile;
