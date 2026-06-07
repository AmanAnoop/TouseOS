"use client";

import { useParams } from "next/navigation";
import { GreekTripDetail } from "@/components/travel/greek-trip-detail";
import { SportsTripDetail } from "@/components/travel/sports-trip-detail";
import { travelProductFromOrgType } from "@/lib/travel-config";
import { useOrg } from "@/hooks/use-org";

export default function TravelTripDetailPage() {
  const params = useParams();
  const tripId = String(params.id);
  const { orgType } = useOrg();
  const product = travelProductFromOrgType(orgType);

  if (product === "greek") {
    return <GreekTripDetail tripId={tripId} />;
  }

  return <SportsTripDetail tripId={tripId} />;
}
