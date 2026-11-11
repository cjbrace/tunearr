import Modal from "./Modal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  artistName: string;
  albumTitle: string;
  onAddToLibrary?: () => void;
};

export default function RequestAlbumModal({
  isOpen,
  onClose,
  artistName,
  albumTitle,
  onAddToLibrary,
}: Props) {
  const confirm = () => {
    onAddToLibrary?.();
    onClose();
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Request album
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {albumTitle} by {artistName}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={confirm}
            className="rounded-xl border-2 border-black bg-pink-400 px-4 py-2 font-bold text-black"
          >
            Request album
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-black px-4 py-2 dark:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
