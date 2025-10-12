import api from "./api";

// Fetch current user's profile
export const fetchProfile = async (token) => {
  if (!token) throw new Error("User not authenticated");

  try {
    const response = await api.get("/api/profile/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status !== 200) {
      throw new Error("Failed to fetch profile");
    }

    const datas = response.data;

    const transformProfile = (datas) => ({
      name: datas.name || "Users",
      email: datas.email || "user@example.com",
      role: datas.role || "Job Seeker",
      phone: datas.phone || "",          // match backend
      gender: datas.gender || "",
      dob: datas.dob || "",
      address: datas.address || "",
      bio: datas.bio || "",
      skills: datas.skills || [],
      current_com: datas.current_com || "",  // match backend
      current_role: datas.current_role || "",
      portfolio: datas.portfolio || "",
      linked_in: datas.linked_in || "",      // match backend
      git: datas.git || "",
      resumeBase64: datas.resumeBase64 || "",
      education: (datas.education || []).map((edu) => ({
        degree: edu.degree,
        type: edu.type,
        college: edu.college,
      })),
      experience: (datas.experience || []).map((exp) => ({
        title: exp.title,
        company: exp.company,
        duration: exp.duration,
        description: exp.description,
      })),
      projects: (datas.projects || []).map((p) => ({
        name: p.name,
        link: p.link,
        description: p.description,
      })),
    });

    return transformProfile(datas);
  } catch (err) {
    console.error("Profile fetch failed:", err.response?.data || err.message);
    throw err;
  }
};

// Reverse transform to send data to backend
const reverseTransformProfile = (profile) => ({
  name: profile.name,
  email: profile.email,
  role: profile.role,
  phone: profile.phone,             // match backend
  gender: profile.gender,
  dob: profile.dob,
  address: profile.address,
  bio: profile.bio,
  skills: profile.skills,
  current_com: profile.current_com,     // match backend
  current_role: profile.current_role,
  portfolio: profile.portfolio,
  linked_in: profile.linked_in,         // match backend
  git: profile.git,
  resumeBase64: profile.resumeBase64,
  education: (profile.education || []).map((edu) => ({
    degree: edu.degree,
    type: edu.type,
    college: edu.college,
  })),
  experience: (profile.experience || []).map((exp) => ({
    title: exp.title,
    company: exp.company,
    duration: exp.duration,
    description: exp.description,
  })),
  projects: (profile.projects || []).map((p) => ({
    name: p.name,
    link: p.link,
    description: p.description,
  })),
});

// Update profile
export const updateProfile = async (profileData, token) => {
  if (!token) throw new Error("User not authenticated");

  try {
    const reversed = reverseTransformProfile(profileData);

    // Remove null or undefined values
    const cleanData = JSON.parse(
      JSON.stringify(reversed, (key, value) => (value === null ? undefined : value))
    );

    console.log("Final payload to backend:", cleanData);

    const response = await api.put("/api/profile/edit", cleanData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status !== 200) {
      throw new Error("Failed to update profile");
    }

    return response.data;
  } catch (err) {
    console.error("Profile update failed:", err.response?.data || err.message);
    throw err;
  }
};
