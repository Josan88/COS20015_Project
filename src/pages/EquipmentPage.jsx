import { useState } from "react";
import EquipmentGrid from "../components/equipment/EquipmentGrid";
import LoanFormModal from "../components/loans/LoanFormModal";
import AddEquipmentModal from "../components/equipment/AddEquipmentModal";
import EditEquipmentModal from "../components/equipment/EditEquipmentModal";

/**
 * EquipmentPage
 * Displays the equipment grid and manages the loan-creation flow.
 *
 * Props:
 *   equipment  {array}
 *   onLoan     {fn(item, borrower)} - called after form submission
 *   onCreateEquipment {fn(data)}
 *   onUpdateEquipment {fn(id, data)}
 *   onDeleteEquipment {fn(id)}
 */
export default function EquipmentPage({ equipment, onLoan, onCreateEquipment, onUpdateEquipment, onDeleteEquipment }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [showLoanModal, setShowLoanModal]       = useState(false);
  const [showAddModal, setShowAddModal]         = useState(false);
  const [showEditModal, setShowEditModal]       = useState(false);

  const handleSelect = (item) => {
    setSelectedItem(item);
    setShowLoanModal(false);
  };

  const handleOpenModal = () => {
    if (selectedItem) setShowLoanModal(true);
  };

  const handleSubmit = (borrower) => {
    onLoan(selectedItem, borrower);
    setSelectedItem(null);
    setShowLoanModal(false);
  };

  const handleAdd = async (data) => {
    await onCreateEquipment(data);
    setShowAddModal(false);
  };

  const handleEdit = async (updates) => {
    await onUpdateEquipment(selectedItem.id, updates);
    setShowEditModal(false);
    setSelectedItem(null);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    if (!confirm(`Delete "${selectedItem.name}"?`)) return;
    await onDeleteEquipment(selectedItem.id);
    setSelectedItem(null);
  };

  return (
    <>
      <EquipmentGrid
        equipment={equipment}
        selectedItem={selectedItem}
        onSelect={handleSelect}
        onLoan={handleOpenModal}
        onAdd={() => setShowAddModal(true)}
        onEdit={() => setShowEditModal(true)}
        onDelete={handleDelete}
      />

      {showLoanModal && selectedItem && (
        <LoanFormModal
          equipment={selectedItem}
          onClose={() => setShowLoanModal(false)}
          onSubmit={handleSubmit}
        />
      )}

      {showAddModal && (
        <AddEquipmentModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAdd}
        />
      )}

      {showEditModal && selectedItem && (
        <EditEquipmentModal
          equipment={selectedItem}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEdit}
        />
      )}
    </>
  );
}
