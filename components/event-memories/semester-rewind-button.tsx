"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import { downloadCsv } from "@/lib/utils";

export function SemesterRewindButton({ orgId, orgName, eventCount }: { orgId: string; orgName: string; eventCount: number }) {
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/semester-rewind?orgId=${orgId}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to generate rewind");
        return;
      }
      downloadCsv(`${orgName}-semester-rewind.csv`, [{
        "Total Revenue": data.summary?.totalRevenue,
        "Total Events": data.summary?.totalEvents ?? eventCount,
        "Attendance Rate": data.summary?.attendanceRate,
        "Top Event": data.summary?.topEvent,
        "Member Count": data.summary?.memberCount,
      }]);
      toast.success("Semester rewind exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={generate}
      className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors flex-shrink-0 disabled:opacity-60"
    >
      <Download size={16} />
      {loading ? "Generating..." : "Generate"}
    </button>
  );
}
