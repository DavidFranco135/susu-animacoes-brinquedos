import React, { useState, useRef } from 'react';
import {
  FileSignature,
  Receipt,
  Download,
  X,
  Eye,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Rental, Customer, CompanySettings, User } from '../types';

interface Props {
  type: 'contract' | 'receipt';
  rentals: Rental[];
  customers: Customer[];
  company: CompanySettings;
}

const DocumentsPage: React.FC<Props> = ({ type, rentals, customers, company }) => {
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [contractImage, setContractImage] = useState<string | null>(null);

  const [contractTerms, setContractTerms] = useState(
    company.contractTerms ||
      `1. OBJETO: A CONTRATADA compromete-se a disponibilizar os brinquedos.
2. RESPONSABILIDADE: O CONTRATANTE assume responsabilidade por danos.
3. CANCELAMENTO: Cancelamentos com menos de 48h não têm estorno.`
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const userStr = localStorage.getItem('susu_user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;

  const Title = type === 'contract' ? 'Contrato de Locação' : 'Recibo de Pagamento';
  const Icon = type === 'contract' ? FileSignature : Receipt;

  // ✅ GERA PDF DO CONTAINER A4 REAL (FORA DO MODAL)
  const handleDownloadPDF = async () => {
    const element = document.getElementById('pdf-root');
    if (!element) return;

    const html2pdf = (window as any).html2pdf;

    await html2pdf()
      .set({
        margin: 15,
        filename: `${type}-${selectedRental?.customerName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .from(element)
      .save();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setContractImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ✅ CONTEÚDO DO PDF (A4 REAL, SEM LIMITES)
  const PdfContent = () => {
    if (!selectedRental) return null;

    return (
      <div
        id="pdf-root"
        className="bg-white text-slate-800 font-serif space-y-8 p-12"
        style={{ width: '210mm', minHeight: '297mm' }}
      >
        <div className="text-center space-y-2 border-b pb-6">
          <h1 className="text-2xl font-black uppercase">{Title}</h1>
          <p className="text-xs">
            {company.name} — CNPJ: {company.cnpj}
          </p>
          <p className="text-xs">{company.address}</p>
        </div>

        <div className="text-sm space-y-2">
          <p><strong>Cliente:</strong> {selectedRental.customerName}</p>
          <p>
            <strong>Documento:</strong>{' '}
            {customers.find(c => c.id === selectedRental.customerId)?.cpf ||
              customers.find(c => c.id === selectedRental.customerId)?.cnpj ||
              'Não informado'}
          </p>
          <p><strong>Endereço do evento:</strong> {selectedRental.eventAddress}</p>
        </div>

        <div className="bg-slate-100 p-6 rounded-xl text-sm">
          <p><strong>Valor total:</strong> R$ {selectedRental.totalValue.toLocaleString('pt-BR')}</p>
          <p><strong>Entrada paga:</strong> R$ {selectedRental.entryValue.toLocaleString('pt-BR')}</p>
        </div>

        <div className="text-sm whitespace-pre-line leading-relaxed">
          {type === 'contract'
            ? contractTerms
            : `Declaramos que recebemos o valor acima referente à locação.`}
        </div>

        {contractImage && (
          <img src={contractImage} className="w-full rounded-xl border mt-6" />
        )}

        <div className="pt-32 grid grid-cols-2 gap-16 text-center text-xs font-bold uppercase">
          <div className="border-t pt-2">{company.name}</div>
          <div className="border-t pt-2">{selectedRental.customerName}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <header className="flex justify-between items-center print:hidden">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 text-white rounded-xl">
            <Icon size={24} />
          </div>
          <h1 className="text-2xl font-bold">{Title}s</h1>
        </div>
      </header>

      {/* LISTA */}
      <div className="bg-white rounded-xl border print:hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-xs uppercase">
            <tr>
              <th className="p-4">Data</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Valor</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rentals.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-4">{r.date}</td>
                <td className="p-4">{r.customerName}</td>
                <td className="p-4 font-bold">
                  R$ {r.totalValue.toLocaleString('pt-BR')}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => setSelectedRental(r)}
                    className="text-blue-600 font-bold flex gap-2 items-center"
                  >
                    <Eye size={16} /> Visualizar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL (APENAS VISUALIZAÇÃO) */}
      {selectedRental && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl">
            <div className="p-6 border-b flex justify-between">
              <h2 className="font-bold text-xs uppercase">Visualização</h2>
              <button onClick={() => setSelectedRental(null)}>
                <X />
              </button>
            </div>

            <div className="p-6 text-sm">
              <p><strong>Cliente:</strong> {selectedRental.customerName}</p>
              <p><strong>Valor:</strong> R$ {selectedRental.totalValue.toLocaleString('pt-BR')}</p>
            </div>

            <div className="p-6 border-t flex justify-end">
              <button
                onClick={handleDownloadPDF}
                className="bg-slate-900 text-white px-8 py-4 rounded-xl flex gap-2 items-center font-bold"
              >
                <Download size={18} /> Baixar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔒 PDF INVISÍVEL (FORA DO MODAL) */}
      <div className="hidden">
        <PdfContent />
      </div>
    </div>
  );
};

export default DocumentsPage;
