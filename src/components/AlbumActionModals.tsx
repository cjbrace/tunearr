import RequestAlbumModal from "./RequestAlbumModal";
import PurchasePriceModal from "./PurchasePriceModal";
import type { AlbumActions } from "../hooks/useAlbumActions";

interface AlbumActionModalsProps {
  actions: AlbumActions;
}

export default function AlbumActionModals({ actions }: AlbumActionModalsProps) {
  return (
    <>
      <RequestAlbumModal
        isOpen={actions.isLinksModalOpen}
        onClose={actions.closeLinksModal}
        artistName={actions.artistName}
        albumTitle={actions.albumTitle}
        onAddToLibrary={actions.handleAddToLibrary}
      />
      <PurchasePriceModal
        isOpen={actions.isPriceModalOpen}
        onClose={actions.closePriceModal}
        artistName={actions.artistName}
        albumTitle={actions.albumTitle}
        onConfirm={actions.handleRecordPurchase}
        saving={actions.recordingPurchase}
      />
    </>
  );
}
