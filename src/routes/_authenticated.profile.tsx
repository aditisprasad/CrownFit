import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { getMyProfile, saveMyProfile } from "@/lib/profile.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Contestant Profile — CrownFit" },
      { name: "description", content: "Your CrownFit contestant profile: measurements, skills, goals and pageant targets." },
      { property: "og:title", content: "Contestant Profile — CrownFit" },
      { property: "og:description", content: "Your CrownFit contestant profile and pageant targets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

type Form = {
  full_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  city: string;
  state: string;
  height_cm: string;
  weight_kg: string;
  bust_cm: string;
  waist_cm: string;
  hips_cm: string;
  dress_size: string;
  shoe_size: string;
  education: string;
  languages: string;
  skills: string;
  bio: string;
  experience: string;
  target_pageant: string;
  target_year: string;
};

const EMPTY: Form = {
  full_name: "", date_of_birth: "", gender: "", nationality: "", city: "", state: "",
  height_cm: "", weight_kg: "", bust_cm: "", waist_cm: "", hips_cm: "", dress_size: "",
  shoe_size: "", education: "", languages: "", skills: "", bio: "", experience: "",
  target_pageant: "", target_year: "",
};

function num(v: string) {
  const n = Number(v);
  return v.trim() === "" || Number.isNaN(n) ? null : n;
}

function ProfilePage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMyProfile);
  const saveFn = useServerFn(saveMyProfile);
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: () => getFn() });
  const [form, setForm] = useState<Form>(EMPTY);

  useEffect(() => {
    if (!data) return;
    setForm({
      full_name: data.full_name ?? "",
      date_of_birth: data.date_of_birth ?? "",
      gender: data.gender ?? "",
      nationality: data.nationality ?? "",
      city: data.city ?? "",
      state: data.state ?? "",
      height_cm: data.height_cm?.toString() ?? "",
      weight_kg: data.weight_kg?.toString() ?? "",
      bust_cm: data.bust_cm?.toString() ?? "",
      waist_cm: data.waist_cm?.toString() ?? "",
      hips_cm: data.hips_cm?.toString() ?? "",
      dress_size: data.dress_size ?? "",
      shoe_size: data.shoe_size ?? "",
      education: data.education ?? "",
      languages: (data.languages ?? []).join(", "),
      skills: (data.skills ?? []).join(", "),
      bio: data.bio ?? "",
      experience: data.experience ?? "",
      target_pageant: data.target_pageant ?? "",
      target_year: data.target_year?.toString() ?? "",
    });
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          full_name: form.full_name || undefined,
          date_of_birth: form.date_of_birth || null,
          gender: form.gender || null,
          nationality: form.nationality || null,
          city: form.city || null,
          state: form.state || null,
          height_cm: num(form.height_cm),
          weight_kg: num(form.weight_kg),
          bust_cm: num(form.bust_cm),
          waist_cm: num(form.waist_cm),
          hips_cm: num(form.hips_cm),
          dress_size: form.dress_size || null,
          shoe_size: form.shoe_size || null,
          education: form.education || null,
          languages: form.languages ? form.languages.split(",").map((s) => s.trim()).filter(Boolean) : [],
          skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
          bio: form.bio || null,
          experience: form.experience || null,
          target_pageant: form.target_pageant || null,
          target_year: num(form.target_year),
          onboarding_completed: true,
        },
      }),
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save profile"),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const field = (key: keyof Form, label: string, type = "text") => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Input id={key} type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center gap-3">
        <UserRound className="h-6 w-6 text-gold" />
        <div>
          <h1 className="font-display text-3xl">Contestant Profile</h1>
          <p className="text-xs text-muted-foreground">Everything Anaira and the jury use to personalise your coaching.</p>
        </div>
      </div>

      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <section className="glass-panel rounded-xl p-6">
          <p className="eyebrow mb-4">Identity</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("full_name", "Full name")}
            {field("date_of_birth", "Date of birth", "date")}
            {field("gender", "Gender")}
            {field("nationality", "Nationality")}
            {field("city", "City")}
            {field("state", "State / Region")}
          </div>
        </section>

        <section className="glass-panel rounded-xl p-6">
          <p className="eyebrow mb-4">Measurements</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {field("height_cm", "Height (cm)", "number")}
            {field("weight_kg", "Weight (kg)", "number")}
            {field("bust_cm", "Bust (cm)", "number")}
            {field("waist_cm", "Waist (cm)", "number")}
            {field("hips_cm", "Hips (cm)", "number")}
            {field("dress_size", "Dress size")}
            {field("shoe_size", "Shoe size")}
          </div>
        </section>

        <section className="glass-panel rounded-xl p-6">
          <p className="eyebrow mb-4">Background &amp; goals</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("education", "Education")}
            {field("languages", "Languages (comma separated)")}
            {field("skills", "Talents & skills (comma separated)")}
            {field("target_pageant", "Target pageant")}
            {field("target_year", "Target year", "number")}
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="bio">Bio / platform</Label>
            <Textarea id="bio" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="experience">Pageant experience</Label>
            <Textarea
              id="experience"
              rows={3}
              value={form.experience}
              onChange={(e) => setForm({ ...form, experience: e.target.value })}
            />
          </div>
        </section>

        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save profile
        </Button>
      </form>
    </div>
  );
}
