import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Badge, Button, Card, CardHeader, EmptyState, PageHeader,
} from "@/components/ui";
import { Building, Phone, Star } from "lucide-react";

export const metadata = { title: "Vendor Memory" };
export const dynamic = "force-dynamic";

const VENDOR_CATEGORIES = [
  "Venue","DJ","Caterer","Security","Bus company","Photographer",
  "T-shirt vendor","Hotel","Rental van","Uniform vendor",
  "Equipment vendor","Field/court rental","Repair contractor",
];

export default async function VendorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).limit(1).single();
  if (!m) redirect("/onboarding");

  const { data: vendors } = await supabase
    .from("vendors")
    .select("*")
    .eq("org_id", m.org_id)
    .order("category")
    .order("name");

  const vendorList = (vendors ?? []) as Array<Record<string, unknown>>;
  const byCategory = VENDOR_CATEGORIES.reduce<Record<string, typeof vendorList>>((acc, cat) => {
    acc[cat] = vendorList.filter((v) => String(v.category).toLowerCase() === cat.toLowerCase());
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendor Memory"
        description="Your chapter's institutional knowledge of vendors, venues, and service providers"
        action={
          <form action="/api/vendors" method="POST">
            <Button type="button" size="sm" icon={<Building size={14} />}>Add vendor</Button>
          </form>
        }
      />

      {vendorList.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={<Building size={24} />}
            title="No vendors tracked yet"
            description="Add your venues, DJs, caterers, security companies, and other vendors so future officers can access this institutional knowledge."
            action={<Button size="sm" icon={<Building size={14} />}>Add first vendor</Button>}
          />
          <Card>
            <CardHeader title="Why track vendors?" />
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { title: "Officer transitions", body: "Incoming officers instantly know who to call for venues, catering, and security without starting from scratch." },
                { title: "Reliability ratings", body: "Rate vendors 1-5 stars and track whether you'd use them again." },
                { title: "Cost history", body: "Know what you paid for venues and vendors in past years so you can budget accurately." },
                { title: "Contract storage", body: "Upload vendor contracts directly to the record so they're never lost in someone's email." },
              ].map((item) => (
                <div key={item.title} className="p-3 rounded-lg bg-surface-1 border border-border">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.body}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-5">
          {VENDOR_CATEGORIES.filter((cat) => byCategory[cat]?.length > 0).map((category) => (
            <Card key={category}>
              <CardHeader title={category} />
              <div className="space-y-3">
                {byCategory[category].map((vendor) => (
                  <div key={String(vendor.id)} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-surface-1 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-greek-50 dark:bg-greek-950/30 flex items-center justify-center text-greek-600 flex-shrink-0">
                      <Building size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{String(vendor.name)}</p>
                        {Boolean(vendor.would_use_again) && <Badge label="Would use again" color="green" />}
                        {Number(vendor.reliability_rating) > 0 && (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: Math.min(5, Number(vendor.reliability_rating)) }).map((_, i) => (
                              <Star key={i} size={10} className="text-yellow-400 fill-yellow-400" />
                            ))}
                          </div>
                        )}
                      </div>
                      {Boolean(vendor.contact_name) && (
                        <p className="text-xs text-muted-foreground mt-0.5">Contact: {String(vendor.contact_name)}</p>
                      )}
                      {Boolean(vendor.contact_email) && (
                        <p className="text-xs text-muted-foreground">{String(vendor.contact_email)}</p>
                      )}
                      {Number(vendor.total_spent) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Total spent: ${Number(vendor.total_spent).toLocaleString()}
                        </p>
                      )}
                      {Boolean(vendor.notes) && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{String(vendor.notes)}</p>
                      )}
                    </div>
                    {Boolean(vendor.contact_phone) && (
                      <a href={`tel:${vendor.contact_phone}`} className="flex-shrink-0 p-2 rounded-lg hover:bg-surface-2 text-muted-foreground hover:text-greek-600">
                        <Phone size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
