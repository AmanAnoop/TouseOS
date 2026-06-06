"use client";

import { Modal } from "@/components/ui";
import type { ProductId } from "@/lib/org-product";
import { SidebarEditorPanel } from "@/components/layout/sidebar-editor-panel";

interface SidebarEditorModalProps {
  open: boolean;
  onClose: () => void;
  product: ProductId;
  unreadCount?: number;
  hasGreekMembership?: boolean;
}

export function SidebarEditorModal({
  open,
  onClose,
  product,
  unreadCount = 0,
  hasGreekMembership = false,
}: SidebarEditorModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Customize sidebar"
      description="Show, hide, and reorder links in your navigation."
      size="lg"
    >
      <SidebarEditorPanel
        product={product}
        unreadCount={unreadCount}
        hasGreekMembership={hasGreekMembership}
        compact
      />
    </Modal>
  );
}
