"use client";

import { useState } from "react";
import { Check, Heart, Save, User } from "lucide-react";
import {
  Alert, Badge, Button, Card, CardHeader,
  Input, Modal,
} from "@/components/ui";

export interface GreekMatchFormData {
  optedIn: boolean;
  displayName: string;
  age: string;
  gender: string;
  interestedIn: string[];
  showOrgName: boolean;
  showFullName: boolean;
  sameOrgOk: boolean;
  geoRadius: string;
  minAge: string;
  maxAge: string;
}

interface GreekMatchSettingsProps {
  form: GreekMatchFormData;
  saving?: boolean;
  onChange: (updates: Partial<GreekMatchFormData>) => void;
  onToggleInterest: (value: string) => void;
  onSave: () => void;
  onPause: () => void;
  onOptOut: () => void;
}

const GENDER_OPTIONS = ["man", "woman", "nonbinary", "prefer not to say"];
const INTEREST_OPTIONS = ["men", "women", "nonbinary people", "everyone"];

const PRIVACY_OPTS = [
  { key: "showOrgName" as const, label: "Show org name", description: "Show which Greek org you're in (e.g. 'Kappa Delta')" },
  { key: "showFullName" as const, label: "Show full name", description: "Show your last name on your profile" },
  { key: "sameOrgOk" as const, label: "Allow same-org matches", description: "Allow matching with members of your own chapter" },
];

export function GreekMatchSettings({
  form,
  saving,
  onChange,
  onToggleInterest,
  onSave,
  onPause,
  onOptOut,
}: GreekMatchSettingsProps) {
  const [confirmOptOut, setConfirmOptOut] = useState(false);

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 p-6 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={20} className="fill-white" />
            <span className="font-bold text-lg">GreekMatch</span>
            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">Beta</span>
          </div>
          <p className="text-white/90 text-sm max-w-sm">
            Meet verified Greek students across campus. 100% opt-in, privacy-first, and exclusive to your university&apos;s Greek community.
          </p>
          {form.optedIn && (
            <Badge label="Active" color="green" className="mt-3 bg-white/20 text-white border-transparent" />
          )}
        </div>
      </div>

      {!form.optedIn ? (
        <>
          <Alert
            type="info"
            title="How GreekMatch works"
            description="You'll only be shown to other opted-in Greek students. Your org chapter info is not shared beyond your org name (optional). You can pause or opt out at any time."
          />
          <Card>
            <CardHeader title="Set up your GreekMatch profile" description="Only visible to other opted-in Greek members" />
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Display name"
                  placeholder="Alex (first name only recommended)"
                  hint="We recommend using your first name only for privacy."
                  value={form.displayName}
                  onChange={(e) => onChange({ displayName: e.target.value })}
                />
                <Input
                  label="Age"
                  type="number"
                  placeholder="21"
                  hint="Must be 18+"
                  value={form.age}
                  onChange={(e) => onChange({ age: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">I identify as</label>
                <div className="flex gap-2 flex-wrap">
                  {GENDER_OPTIONS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => onChange({ gender: g })}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors capitalize ${form.gender === g ? "bg-rose-500 text-white border-rose-500" : "border-border text-muted-foreground hover:border-rose-400"}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">Interested in</label>
                <p className="text-xs text-muted-foreground mb-2">Select all that apply</p>
                <div className="flex gap-2 flex-wrap">
                  {INTEREST_OPTIONS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onToggleInterest(val)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors capitalize ${form.interestedIn.includes(val) ? "bg-rose-500 text-white border-rose-500" : "border-border text-muted-foreground hover:border-rose-400"}`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Min age preference" type="number" value={form.minAge} onChange={(e) => onChange({ minAge: e.target.value })} />
                <Input label="Max age preference" type="number" value={form.maxAge} onChange={(e) => onChange({ maxAge: e.target.value })} />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Privacy controls" />
            <div className="space-y-3">
              {PRIVACY_OPTS.map((opt) => (
                <label key={opt.key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded"
                    checked={form[opt.key]}
                    onChange={(e) => onChange({ [opt.key]: e.target.checked })}
                  />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 text-sm text-rose-800 dark:text-rose-300">
            <p className="font-semibold mb-1">By opting in to GreekMatch you agree that:</p>
            <ul className="space-y-1 text-xs">
              <li>✓ You are 18+ years old</li>
              <li>✓ Your profile will be visible to other opted-in Greek members on your campus</li>
              <li>✓ You can pause or remove your profile at any time</li>
              <li>✓ You will use GreekMatch respectfully and not harass other users</li>
            </ul>
          </div>

          <Button
            onClick={onSave}
            loading={saving}
            disabled={!form.displayName || !form.gender || form.interestedIn.length === 0}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
            icon={<Heart size={14} className="fill-white" />}
          >
            Join GreekMatch
          </Button>
        </>
      ) : (
        <>
          <Card>
            <CardHeader title="Your GreekMatch profile" action={<Badge label="Active" color="green" dot />} />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Display name</label>
                <input className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.displayName} onChange={(e) => onChange({ displayName: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Age</label>
                <input type="number" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.age} onChange={(e) => onChange({ age: e.target.value })} />
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Interested in</p>
              <div className="flex gap-2 flex-wrap">
                {INTEREST_OPTIONS.map((val) => (
                  <button key={val} type="button" onClick={() => onToggleInterest(val)} className={`px-3 py-1.5 rounded-full text-sm border transition-colors capitalize ${form.interestedIn.includes(val) ? "bg-rose-500 text-white border-rose-500" : "border-border text-muted-foreground"}`}>{val}</button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {PRIVACY_OPTS.map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={form[opt.key]} onChange={(e) => onChange({ [opt.key]: e.target.checked })} />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2 mt-5">
              <Button onClick={onSave} loading={saving} icon={<Save size={14} />} className="flex-1 bg-rose-500 hover:bg-rose-600">
                Save changes
              </Button>
              <Button variant="secondary" onClick={onPause}>Pause</Button>
              <Button variant="danger" onClick={() => setConfirmOptOut(true)}>Opt out</Button>
            </div>
          </Card>

          <div className="grid sm:grid-cols-3 gap-3">
            <a href="/greekmatch" className="block">
              <Card padding="sm" className="text-center hover:border-rose-300 transition-colors cursor-pointer">
                <Heart size={20} className="mx-auto text-rose-500 mb-1" />
                <p className="text-sm font-semibold">Discover</p>
                <p className="text-xs text-muted-foreground">Find matches</p>
              </Card>
            </a>
            <a href="/greekmatch/matches" className="block">
              <Card padding="sm" className="text-center hover:border-rose-300 transition-colors cursor-pointer">
                <Check size={20} className="mx-auto text-green-500 mb-1" />
                <p className="text-sm font-semibold">Matches</p>
                <p className="text-xs text-muted-foreground">View & chat</p>
              </Card>
            </a>
            <a href="/profile?tab=greekmatch" className="block">
              <Card padding="sm" className="text-center hover:border-rose-300 transition-colors cursor-pointer">
                <User size={20} className="mx-auto text-blue-500 mb-1" />
                <p className="text-sm font-semibold">Edit profile</p>
                <p className="text-xs text-muted-foreground">Photos & bio</p>
              </Card>
            </a>
          </div>
        </>
      )}

      <Modal
        open={confirmOptOut}
        onClose={() => setConfirmOptOut(false)}
        title="Opt out of GreekMatch?"
        description="Your profile will be hidden and your matches will be archived. You can re-join anytime."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOptOut(false)}>Keep my profile</Button>
            <Button variant="danger" onClick={() => { onOptOut(); setConfirmOptOut(false); }}>Opt out</Button>
          </>
        }
      >
        <Alert type="warning" title="This will remove your profile from discovery and archive your current matches." />
      </Modal>
    </div>
  );
}
