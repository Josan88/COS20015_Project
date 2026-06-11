import { useState } from "react";
import EquipmentGrid from "../components/equipment/EquipmentGrid";
import LoanFormModal from "../components/loans/LoanFormModal";

/**
 * EquipmentPage
 * Displays the equipment grid and manages the loan-creation flow.
 *
 * Props:
 *   equipment  {array}
 *   onLoan     {fn(item, borrower)} - called after form submission
 */
export default function EquipmentPage({ equipment, onLoan }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal]       = useState(false);

  const handleSelect = (item) => {
    setSelectedItem(item);
    setShowModal(false); // reset modal if a new item is picked
  };

  const handleOpenModal = () => {
    if (selectedItem) setShowModal(true);
  };

  const handleSubmit = (borrower) => {
    onLoan(selectedItem, borrower);
    setSelectedItem(null);
    setShowModal(false);
  };

  return (
    <>
      <EquipmentGrid
        equipment={equipment}
        selectedItem={selectedItem}
        onSelect={handleSelect}
        onLoan={handleOpenModal}
      />

      {showModal && selectedItem && (
        <LoanFormModal
          equipment={selectedItem}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
