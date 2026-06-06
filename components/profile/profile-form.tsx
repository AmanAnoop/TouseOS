"use client";

import { ExternalLink, Lock, Save } from "lucide-react";
import { Button, Card, CardHeader, Input, Select, Textarea } from "@/components/ui";
import { AddressAutocomplete } from "@/components/location/address-autocomplete";
import { MajorSelect } from "@/components/profile/major-select";
import { CLASS_YEARS, graduationYearOptions } from "@/lib/school-majors";

const PROFILE_INTERESTS = [
  "Sports", "Music", "Art", "Photography", "Travel", "Cooking", "Gaming", "Reading",
  "Fitness", "Outdoors", "Dancing", "Film", "Fashion", "Tech", "Business", "Politics",
  "Volunteering", "Comedy", "Podcasts", "Greek Life",
];

export interface ProfileFormData {
  preferredName: string;
  phone: string;
  classYear: string;
  graduationYear: string;
  major: string;
  hometown: string;
  bio: string;
  pronouns: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  instagramUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
  interests: string[];
}

interface ProfileFormProps {
  form: ProfileFormData;
  saving?: boolean;
  onChange: (updates: Partial<ProfileFormData>) => void;
  onToggleInterest: (interest: string) => void;
  onSave: () => void;
}

export function ProfileForm({ form, saving, onChange, onToggleInterest, onSave }: ProfileFormProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Personal info" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Preferred name" placeholder="Alex" value={form.preferredName} onChange={(e) => onChange({ preferredName: e.target.value })} />
          <Input label="Pronouns" placeholder="she/her, he/him, they/them..." value={form.pronouns} onChange={(e) => onChange({ pronouns: e.target.value })} />
          <Input label="Phone" type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={(e) => onChange({ phone: e.target.value })} />
          <Select
            label="Class year"
            value={form.classYear}
            onChange={(e) => onChange({ classYear: e.target.value })}
            placeholder="Select class year"
            options={CLASS_YEARS.map((y) => ({ value: y.value, label: y.label }))}
          />
          <Select
            label="Graduation year"
            value={form.graduationYear}
            onChange={(e) => onChange({ graduationYear: e.target.value })}
            placeholder="Select year"
            options={graduationYearOptions()}
          />
          <MajorSelect value={form.major} onChange={(major) => onChange({ major })} />
          <div className="sm:col-span-2">
            <AddressAutocomplete
              label="Hometown"
              value={form.hometown}
              placeholder="Start typing your hometown…"
              onSelect={(place) => onChange({ hometown: place.address || place.venueName })}
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Bio" description="Tell your chapter a bit about yourself" />
        <Textarea
          placeholder="Hi! I'm a junior studying Marketing..."
          value={form.bio}
          onChange={(e) => onChange({ bio: e.target.value })}
          className="min-h-[100px]"
        />
        <p className="text-xs text-muted-foreground mt-1">{form.bio.length}/300</p>
      </Card>

      <Card>
        <CardHeader title="Interests" description="Select up to 10 interests" />
        <div className="flex flex-wrap gap-2">
          {PROFILE_INTERESTS.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => onToggleInterest(interest)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                form.interests.includes(interest)
                  ? "bg-greek-600 text-white border-greek-600"
                  : "border-border text-muted-foreground hover:border-greek-400"
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Emergency contact" icon={<Lock size={14} />} description="Only visible to officers and admins" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Name" value={form.emergencyContactName} onChange={(e) => onChange({ emergencyContactName: e.target.value })} placeholder="Parent / guardian name" />
          <Input label="Phone" type="tel" value={form.emergencyContactPhone} onChange={(e) => onChange({ emergencyContactPhone: e.target.value })} placeholder="+1 (555) 000-0000" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Social links" description="Optional — visible to chapter members" />
        <div className="space-y-3">
          <Input label="Instagram" placeholder="@yourusername" value={form.instagramUrl} onChange={(e) => onChange({ instagramUrl: e.target.value })} trailing={<ExternalLink size={14} />} />
          <Input label="LinkedIn" placeholder="linkedin.com/in/you" value={form.linkedinUrl} onChange={(e) => onChange({ linkedinUrl: e.target.value })} trailing={<ExternalLink size={14} />} />
          <Input label="Twitter / X" placeholder="@yourusername" value={form.twitterUrl} onChange={(e) => onChange({ twitterUrl: e.target.value })} trailing={<ExternalLink size={14} />} />
        </div>
      </Card>

      <Button onClick={onSave} loading={saving} icon={<Save size={14} />} className="w-full sm:w-auto">
        Save profile
      </Button>
    </div>
  );
}
