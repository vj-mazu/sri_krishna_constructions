import React, { useEffect } from 'react';
import { Download, Printer, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SKC_LOGO_BASE64 } from '../logoBase64';
import { showToast } from '../toast';

export const SaleInvoiceModal: React.FC<{ 
  sale: any | any[]; 
  onClose: () => void;
  invoiceType?: 'INWARD' | 'OUTWARD' | 'WORK_ORDER';
}> = ({ sale, onClose, invoiceType }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!sale) return null;
  
  // Normalize to array of sales / inward records
  const salesList: any[] = Array.isArray(sale) ? sale : [sale];
  if (salesList.length === 0) return null;

  const primarySale = salesList[0];
  const isInward = invoiceType === 'INWARD' || primarySale.type === 'INWARD' || primarySale.type === 'PURCHASE';
  const invoiceNo = primarySale.invoiceNumber || primarySale.partyInvoiceNumber || primarySale.invoiceRefNo || `SKC/2025-26/${primarySale.id?.slice(0, 4) || '01'}`;
  const invoiceDate = primarySale.invoiceDate 
    ? new Date(primarySale.invoiceDate).toLocaleDateString('en-GB') 
    : (primarySale.date ? new Date(primarySale.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
  
  // Dynamic Reference: Work Order vs PO vs Inward vs Direct Sale
  const isWorkOrder = invoiceType === 'WORK_ORDER' || primarySale.sourceType === 'WORK_ORDER' || !!primarySale.workOrderNumber;
  const isPo = !!(primarySale.purchaseOrder?.poNumber || (primarySale.poNumber && primarySale.poNumber !== '-'));
  
  const refLabel = isInward ? 'Supplier Inv No' : (isWorkOrder ? 'WO No' : (isPo ? 'PO No' : 'Ref No'));
  const refNumber = isInward 
    ? (primarySale.partyInvoiceNumber || primarySale.invoiceNumber || '-')
    : (isWorkOrder 
      ? (primarySale.workOrderNumber || primarySale.poNumber || '-') 
      : (primarySale.poNumber || primarySale.purchaseOrder?.poNumber || '-'));
  
  const dateLabel = isInward ? 'Supplier Inv Date' : (isWorkOrder ? 'WO Date' : (isPo ? 'PO Date' : 'Order Date'));
  const rawRefDate = isInward
    ? (primarySale.supplierInvoiceDate || primarySale.invoiceDate || primarySale.date)
    : (isWorkOrder 
      ? (primarySale.workOrderDate || primarySale.poDate) 
      : (primarySale.poDate || primarySale.purchaseOrder?.date));
  const refDate = rawRefDate ? new Date(rawRefDate).toLocaleDateString('en-GB') : invoiceDate;

  // Party info
  const partyName = primarySale.partyName || (isInward ? 'Supplier' : 'Customer');
  const partyAddress = primarySale.partyAddress || primarySale.supplierAddress || '';
  const partyGst = primarySale.gstNumber || primarySale.partyGstNumber || '';
  const isKpclParty = !isInward && /kpcl|rtps|raichur thermal/i.test(partyName);

  // Format currency helper preserving paise if fractional
  const fmt = (n: number) => {
    const rounded = Math.round((Number(n) + Number.EPSILON) * 100) / 100;
    return rounded.toLocaleString('en-IN', {
      minimumFractionDigits: rounded % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2
    });
  };
  const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  // Calculate totals across all items with precision
  let totalBasic = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalShipping = 0;

  const itemsRows = salesList.map((s, idx) => {
    const itm = s.purchaseOrderItem || s.item || s.stock || {};
    const q = Number(s.qty || s.quantity || 0);
    const r = Number(s.rate || s.unitPrice || 0);
    const b = round2(q * r);
    const ship = Number(s.shippingCharges || 0);
    
    const cgstPct = s.cgstPercent !== undefined ? Number(s.cgstPercent) : 0;
    const sgstPct = s.sgstPercent !== undefined ? Number(s.sgstPercent) : 0;
    const igstPct = s.igstPercent !== undefined ? Number(s.igstPercent) : 0;

    const cg = round2(b * (cgstPct / 100));
    const sg = round2(b * (sgstPct / 100));
    const ig = round2(b * (igstPct / 100));

    totalBasic = round2(totalBasic + b);
    totalCgst = round2(totalCgst + cg);
    totalSgst = round2(totalSgst + sg);
    totalIgst = round2(totalIgst + ig);
    totalShipping = round2(totalShipping + ship);

    return {
      slNo: idx + 1,
      kpclCode: itm.kpclCode || s.kpclCode || '-',
      itemName: itm.itemName || s.itemName || 'STANDALONE ITEM',
      specifications: itm.specifications || s.description || s.remarks || (isInward ? 'INWARD MATERIAL RECEIPT' : 'DIRECT PURCHASE / SALE'),
      partNumber: itm.partNumber || s.partNumber || s.receivedPartNumber || '',
      unit: itm.unit || s.unit || "NOS",
      qty: q,
      rate: r,
      amount: b,
      shippingCharges: ship,
      cgstPercent: cgstPct,
      sgstPercent: sgstPct,
      igstPercent: igstPct
    };
  });

  const totalInvoiceAmount = round2(totalBasic + totalCgst + totalSgst + totalIgst + totalShipping);

  const effectiveCgstPercent = primarySale.cgstPercent !== undefined ? Number(primarySale.cgstPercent) : (itemsRows[0]?.cgstPercent || 0);
  const effectiveSgstPercent = primarySale.sgstPercent !== undefined ? Number(primarySale.sgstPercent) : (itemsRows[0]?.sgstPercent || 0);
  const effectiveIgstPercent = primarySale.igstPercent !== undefined ? Number(primarySale.igstPercent) : (itemsRows[0]?.igstPercent || 0);

  const downloadPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const margin = 12;
      const contentWidth = pageWidth - (margin * 2); // 186mm

      let y = 10;

      // 1. TOP HEADER WITH RED ORIGINAL LOGO & BUSINESS INFO
      if (SKC_LOGO_BASE64) {
        try {
          doc.addImage(SKC_LOGO_BASE64, 'PNG', margin, y, 25, 25);
        } catch (e) {
          console.warn('Logo render fallback:', e);
        }
      }

      // Title text: SRI KRISHNA CONSTRUCTIONS (Bold Red)
      doc.setTextColor(218, 18, 18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('SRI KRISHNA CONSTRUCTIONS', margin + 28, y + 5.5);

      // Subtitle & Address
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('All Types of Compressor Spares and Service , Pipe Line Work , Heavy Fabrication Works', margin + 28, y + 10);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('# 2436, Raghavendar Colony, SHAKTINAGAR - 584 170. Raichur Dist. (Karnataka)', margin + 28, y + 14.5);

      // Contact numbers
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('SUNIL: 8496841904', pageWidth - margin, y + 5.5, { align: 'right' });

      // 2. GSTIN / PAN / PF BAR
      y += 24;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.line(margin, y, margin + contentWidth, y);
      y += 3.8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(`GSTIN : 29DWKPP3582H1ZV`, margin + 2, y);
      doc.text(`PAN No. DWKPP3582H`, margin + 68, y);
      doc.text(`PF No. GBRCH1955403000`, margin + 128, y);

      y += 2;
      doc.line(margin, y, margin + contentWidth, y);
      y += 3.5;

      // 3. BOXED TITLE
      doc.rect(margin, y, contentWidth, 7.5);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(isInward ? 'INWARD MATERIAL RECEIPT / PURCHASE INVOICE' : 'TAX INVOICE', margin + (contentWidth / 2), y + 5.2, { align: 'center' });
      y += 7.5;

      // 4. TWO-COLUMN INVOICE & DISPATCH DETAILS GRID
      const boxHeight = 46;
      const colHalf = contentWidth / 2;

      doc.rect(margin, y, contentWidth, boxHeight);
      doc.line(margin + colHalf, y, margin + colHalf, y + boxHeight); // vertical divider

      // Left Column items
      doc.setFontSize(7.2);
      let ly = y + 4;
      doc.setFont('helvetica', 'bold');
      doc.text(`${isInward ? 'RECEIPT NO' : 'INVOICE NO'}: ${invoiceNo}`, margin + 2, ly);
      doc.line(margin, ly + 1.5, margin + colHalf, ly + 1.5);
      
      ly += 5;
      doc.text(`${isInward ? 'RECEIPT DATE' : 'INVOICE DATE'}: ${invoiceDate}`, margin + 2, ly);
      doc.line(margin, ly + 1.5, margin + colHalf, ly + 1.5);

      ly += 4.5;
      doc.text(`${isInward ? 'SUPPLIER / PARTY' : 'SUPPLY To'} : ${partyName}`, margin + 2, ly);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      
      if (partyAddress) {
        const addressLines = doc.splitTextToSize(partyAddress, colHalf - 4);
        doc.text(addressLines.slice(0, 4), margin + 2, ly + 3.8);
      } else if (isKpclParty) {
        doc.text(`TO Paying Authority: Deputy General Manager(F)RTPS`, margin + 2, ly + 3.8);
        doc.text(`Raichur Thermal Power Station (RTPS),KPCL`, margin + 2, ly + 7.2);
        doc.text(`Plant Premises, Shaktinagara, PIN-584170`, margin + 2, ly + 10.6);
        doc.text(`Phone 9449596504 Fax 8532247846`, margin + 2, ly + 14.0);
      } else {
        doc.text(isInward ? `Supplier Location: Verified Vendor` : `Customer Location: Shaktinagar / Raichur Region`, margin + 2, ly + 3.8);
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.text(`GST NO: ${partyGst || 'URP (Unregistered)'}`, margin + 2, ly + 17.5);
      doc.line(margin, ly + 19, margin + colHalf, ly + 19);

      const vehicleLine = `Vehicle No : ${primarySale.vehicleNumber || '-'}${primarySale.eWayBillNumber ? `  |  E-Way: ${primarySale.eWayBillNumber}` : ''}`;
      doc.text(vehicleLine, margin + 2, ly + 23.5);

      // Right Column items
      let ry = y + 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.text(`${refLabel}: ${refNumber}`, margin + colHalf + 2, ry);
      doc.line(margin + colHalf, ry + 1.5, margin + contentWidth, ry + 1.5);

      ry += 5;
      doc.text(`${dateLabel}: ${refDate}`, margin + colHalf + 2, ry);
      doc.line(margin + colHalf, ry + 1.5, margin + contentWidth, ry + 1.5);

      ry += 4.5;
      doc.text(isInward ? `DELIVERED TO (RECEIVER):` : `State of Supply: KARNATAKA (29)`, margin + colHalf + 2, ry);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      
      if (isInward) {
        doc.text(`SRI KRISHNA CONSTRUCTIONS`, margin + colHalf + 2, ry + 3.8);
        doc.text(`#2436, Raghavendar Colony, Shaktinagar - 584170`, margin + colHalf + 2, ry + 7.2);
        doc.text(`Raichur Dist, Karnataka`, margin + colHalf + 2, ry + 10.6);
        doc.setFont('helvetica', 'bold');
        doc.text(`GST NO: 29DWKPP3582H1ZV`, margin + colHalf + 2, ry + 17.5);
      } else if (isKpclParty) {
        doc.text(`Shipped To: Executive Engineer(Stores) Raichur Thermal`, margin + colHalf + 2, ry + 3.8);
        doc.text(`Power Station (RTPS),KPCL Plant Premises,`, margin + colHalf + 2, ry + 7.2);
        doc.text(`Shaktinagara, PIN-584170`, margin + colHalf + 2, ry + 10.6);
        doc.setFont('helvetica', 'bold');
        doc.text(`GST NO: ${partyGst || 'URP (Unregistered)'}`, margin + colHalf + 2, ry + 17.5);
      } else if (partyAddress) {
        doc.text(`Shipped To: ${partyName}`, margin + colHalf + 2, ry + 3.8);
        const shipLines = doc.splitTextToSize(partyAddress, colHalf - 4);
        doc.text(shipLines.slice(0, 3), margin + colHalf + 2, ry + 7.2);
        doc.setFont('helvetica', 'bold');
        doc.text(`GST NO: ${partyGst || 'URP (Unregistered)'}`, margin + colHalf + 2, ry + 17.5);
      } else {
        doc.text(`Shipped To: ${partyName}`, margin + colHalf + 2, ry + 3.8);
        doc.text(`Delivery as per Order Instruction`, margin + colHalf + 2, ry + 7.2);
        doc.setFont('helvetica', 'bold');
        doc.text(`GST NO: ${partyGst || 'URP (Unregistered)'}`, margin + colHalf + 2, ry + 17.5);
      }

      y += boxHeight;

      // 5. INVOICE / RECEIPT ITEMS TABLE
      const tableBody = itemsRows.map((r) => [
        r.slNo.toString(),
        r.kpclCode || '-',
        r.itemName,
        `${r.specifications}${r.partNumber ? `\nPart No: ${r.partNumber}` : ''}`,
        r.unit,
        r.qty.toString(),
        fmt(r.rate),
        fmt(r.amount)
      ]);

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [
          ['SI.\nNO', 'ITEM CODE', 'ITEM NAME', 'SPECIFICATIONS & PART NO', 'UNIT', 'QTY', 'RATE (₹)', 'AMOUNT (₹)']
        ],
        body: tableBody,
        theme: 'grid',
        styles: {
          fontSize: 6.8,
          lineColor: [0, 0, 0],
          lineWidth: 0.25,
          textColor: [0, 0, 0],
          cellPadding: 1.8
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.3,
          lineColor: [0, 0, 0]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
          2: { cellWidth: 36, fontStyle: 'bold' },
          3: { cellWidth: 62 },
          4: { halign: 'center', cellWidth: 12 },
          5: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
          6: { halign: 'right', cellWidth: 15, fontStyle: 'bold' },
          7: { halign: 'right', cellWidth: 17, fontStyle: 'bold' }
        }
      });

      const finalTableY = (doc as any).lastAutoTable?.finalY || (y + 35);

      // 6. TAX TOTALS & SIGNATURE FOOTER
      let fy = finalTableY + 4;

      // Draw Summary Box
      const taxBoxHeight = (totalCgst > 0 || totalSgst > 0 || totalIgst > 0) ? (totalShipping > 0 ? 30 : 25) : (totalShipping > 0 ? 23 : 18);
      doc.rect(margin + 105, fy, 81, taxBoxHeight);
      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'normal');
      doc.text(`Basic Amount:`, margin + 107, fy + 4.5);
      doc.text(`₹${fmt(totalBasic)}`, margin + 184, fy + 4.5, { align: 'right' });

      let taxOffset = 4.5;
      if (totalCgst > 0 || totalSgst > 0) {
        taxOffset += 4.5;
        doc.text(`CGST (${effectiveCgstPercent}%):`, margin + 107, fy + taxOffset);
        doc.text(`₹${fmt(totalCgst)}`, margin + 184, fy + taxOffset, { align: 'right' });

        taxOffset += 4.5;
        doc.text(`SGST (${effectiveSgstPercent}%):`, margin + 107, fy + taxOffset);
        doc.text(`₹${fmt(totalSgst)}`, margin + 184, fy + taxOffset, { align: 'right' });
      } else if (totalIgst > 0) {
        taxOffset += 4.5;
        doc.text(`IGST (${effectiveIgstPercent}%):`, margin + 107, fy + taxOffset);
        doc.text(`₹${fmt(totalIgst)}`, margin + 184, fy + taxOffset, { align: 'right' });
      }

      if (totalShipping > 0) {
        taxOffset += 4.5;
        doc.text(`Shipping Charges:`, margin + 107, fy + taxOffset);
        doc.text(`₹${fmt(totalShipping)}`, margin + 184, fy + taxOffset, { align: 'right' });
      }

      doc.line(margin + 105, fy + taxOffset + 3, margin + 186, fy + taxOffset + 3);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`TOTAL AMOUNT:`, margin + 107, fy + taxOffset + 7.5);
      doc.text(`₹${fmt(totalInvoiceAmount)}`, margin + 184, fy + taxOffset + 7.5, { align: 'right' });

      // Signature blocks
      const sigY = fy + taxOffset + 20;
      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'normal');
      doc.text(isInward ? 'Received By (Stores / Site)' : 'Receiver\'s Signature with Seal', margin + 6, sigY);

      doc.setFont('helvetica', 'bold');
      doc.text('For SRI KRISHNA CONSTRUCTIONS', margin + 120, sigY - 7);
      doc.setFont('helvetica', 'normal');
      doc.text(isInward ? 'Verified & Approved Signatory' : 'Authorised Signatory', margin + 130, sigY);

      doc.setFontSize(6.5);
      doc.text('Page 1 of 1', pageWidth / 2, 288, { align: 'center' });

      doc.save(`${isInward ? 'INWARD_RECEIPT' : 'TAX_INVOICE'}_${invoiceNo.replaceAll('/', '_')}.pdf`);
    } catch (error) {
      console.error('Failed to generate Tax Invoice PDF:', error);
      showToast('Error generating PDF. Please check console for details.', 'error');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* CLEAN MODAL CONTAINER (EXACT MATCH TO SALARY SLIP) */}
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-300 flex flex-col h-[92vh] max-h-[92vh] overflow-hidden animate-fadeIn relative z-[100000]">
        
        {/* Mobile Drag Indicator Bar */}
        <div className="w-12 h-1.5 bg-blue-300/60 rounded-full mx-auto my-1.5 sm:hidden shrink-0" />

        {/* MODAL TOP HEADER BAR */}
        <div className="bg-[#1e3a8a] text-white p-3 sm:p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-base truncate">
                {isInward ? 'Inward Material Receipt / Invoice' : 'Tax Invoice'} • {invoiceNo}
              </h3>
              <p className="text-[9px] sm:text-xs text-blue-200 truncate">
                {itemsRows.length} item{itemsRows.length > 1 ? 's' : ''} • Date: {invoiceDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={downloadPdf}
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] sm:text-xs rounded-lg flex items-center gap-1 shadow cursor-pointer transition-all active:scale-95"
              title="Download Portrait PDF"
            >
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Download</span> PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AUTHENTIC TAX INVOICE SHEET (SCROLLABLE CONTAINER) */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-2 sm:p-6 pb-8 bg-slate-100 flex justify-center">
          <div className="bg-white p-3 sm:p-6 rounded-xl shadow-md border border-slate-300 w-full max-w-3xl text-black font-sans text-xs overflow-x-auto">
            
            {/* 1. TOP HEADER WITH ORIGINAL RED LOGO */}
            <div className="flex items-start gap-4 pb-3 border-b-2 border-black">
              <img 
                src={SKC_LOGO_BASE64 || '/skc_logo.png'} 
                alt="SKC Logo" 
                className="w-16 sm:w-20 h-16 sm:h-20 object-contain shrink-0" 
              />
              <div className="flex-1 text-center pr-2 sm:pr-6">
                <h1 className="text-lg sm:text-2xl font-black text-red-600 tracking-wide uppercase leading-tight font-serif">
                  SRI KRISHNA CONSTRUCTIONS
                </h1>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-900 mt-1">
                  All Types of Compressor Spares and Service , Pipe Line Work , Heavy Fabrication Works
                </p>
                <p className="text-[9px] sm:text-[10px] text-slate-800 mt-0.5">
                  # 2436, Raghavendar Colony, SHAKTINAGAR - 584 170. Raichur Dist. (Karnataka)
                </p>
                <div className="text-[10px] font-bold text-slate-900 mt-1 flex justify-end">
                  <span>SUNIL: 8496841904</span>
                </div>
              </div>
            </div>

            {/* 2. REGISTRATION BAR */}
            <div className="flex justify-between items-center py-1.5 px-2 border-b-2 border-black font-bold text-[10px] sm:text-[11px]">
              <span>GSTIN : 29DWKPP3582H1ZV</span>
              <span>PAN No. DWKPP3582H</span>
              <span>PF No. GBRCH1955403000</span>
            </div>

            {/* 3. TAX INVOICE TITLE BOX */}
            <div className="border border-black my-2.5 py-1.5 text-center font-serif font-black text-base sm:text-lg uppercase tracking-widest bg-slate-50">
              {isInward ? 'INWARD MATERIAL RECEIPT / PURCHASE INVOICE' : 'TAX INVOICE'}
            </div>

            {/* 4. TWO-COLUMN INVOICE & DISPATCH DETAILS */}
            <div className="border border-black grid grid-cols-1 sm:grid-cols-2 text-[10px] sm:text-[11px]">
              {/* Left Column */}
              <div className="sm:border-r border-b sm:border-b-0 border-black divide-y divide-black">
                <div className="p-1.5 font-bold">
                  {isInward ? 'RECEIPT NO' : 'INVOICE NO'}: <span className="font-mono">{invoiceNo}</span>
                </div>
                <div className="p-1.5 font-bold">
                  {isInward ? 'RECEIPT DATE' : 'INVOICE DATE'}: <span className="font-mono">{invoiceDate}</span>
                </div>
                <div className="p-1.5 space-y-0.5 min-h-[90px]">
                  <div className="font-bold">{isInward ? 'SUPPLIER / PARTY' : 'SUPPLY To'} : {partyName}</div>
                  {partyAddress ? (
                    <div className="text-[10px] text-slate-700 whitespace-pre-wrap">{partyAddress}</div>
                  ) : isKpclParty ? (
                    <>
                      <div className="text-[10px] text-slate-700">TO Paying Authority: Deputy General Manager(F)RTPS</div>
                      <div className="text-[10px] text-slate-700">Raichur Thermal Power Station (RTPS),KPCL</div>
                      <div className="text-[10px] text-slate-700">Plant Premises, Shaktinagara, PIN-584170</div>
                      <div className="text-[10px] text-slate-700">Phone 9449596504 Fax 8532247846</div>
                    </>
                  ) : (
                    <div className="text-[10px] text-slate-700">{isInward ? 'Supplier Location: Verified Vendor' : 'Customer Location: Shaktinagar / Raichur Region'}</div>
                  )}
                  <div className="font-bold mt-1">GST NO: {partyGst || 'URP (Unregistered)'}</div>
                </div>
                <div className="p-1.5 font-bold flex flex-wrap items-center justify-between gap-2">
                  <span>Vehicle No : <span className="font-mono uppercase">{primarySale.vehicleNumber || '-'}</span></span>
                  {primarySale.eWayBillNumber && (
                    <span className="text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      E-Way Bill: <span className="font-mono">{primarySale.eWayBillNumber}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="divide-y divide-black">
                <div className="p-1.5 font-bold">
                  {refLabel}: <span className="font-mono">{refNumber}</span>
                </div>
                <div className="p-1.5 font-bold">
                  {dateLabel}: <span className="font-mono">{refDate}</span>
                </div>
                <div className="p-1.5 space-y-0.5 min-h-[90px]">
                  <div className="font-bold">{isInward ? 'DELIVERED TO (RECEIVER):' : 'State of Supply: KARNATAKA (29)'}</div>
                  {isInward ? (
                    <>
                      <div className="text-[10px] text-slate-700 font-bold">SRI KRISHNA CONSTRUCTIONS</div>
                      <div className="text-[10px] text-slate-700">#2436, Raghavendar Colony, Shaktinagar - 584170</div>
                      <div className="text-[10px] text-slate-700">Raichur Dist, Karnataka</div>
                      <div className="font-bold mt-1">GST NO: 29DWKPP3582H1ZV</div>
                    </>
                  ) : isKpclParty ? (
                    <>
                      <div className="text-[10px] text-slate-700">Shipped To: Executive Engineer(Stores) Raichur Thermal</div>
                      <div className="text-[10px] text-slate-700">Power Station (RTPS),KPCL Plant Premises,</div>
                      <div className="text-[10px] text-slate-700">Shaktinagara, PIN-584170</div>
                      <div className="font-bold mt-2">GST NO: {partyGst || 'URP (Unregistered)'}</div>
                    </>
                  ) : partyAddress ? (
                    <>
                      <div className="text-[10px] text-slate-700 font-bold">Shipped To: {partyName}</div>
                      <div className="text-[10px] text-slate-700 whitespace-pre-wrap">{partyAddress}</div>
                      <div className="font-bold mt-2">GST NO: {partyGst || 'URP (Unregistered)'}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-[10px] text-slate-700 font-bold">Shipped To: {partyName}</div>
                      <div className="text-[10px] text-slate-700">Delivery as per Order Instruction</div>
                      <div className="font-bold mt-2">GST NO: {partyGst || 'URP (Unregistered)'}</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 5. TAX INVOICE ITEMS TABLE */}
            <div className="mt-3 border border-black overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-black text-center font-bold bg-slate-50">
                    <th className="p-2 border-r border-black w-10">SI. NO</th>
                    <th className="p-2 border-r border-black w-24">ITEM CODE</th>
                    <th className="p-2 border-r border-black w-36">ITEM NAME</th>
                    <th className="p-2 border-r border-black min-w-[180px]">SPECIFICATIONS & PART NO</th>
                    <th className="p-2 border-r border-black w-14">UNIT</th>
                    <th className="p-2 border-r border-black w-14">QTY</th>
                    <th className="p-2 border-r border-black w-20 text-right">RATE (₹)</th>
                    <th className="p-2 w-24 text-right">AMOUNT (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {itemsRows.map((r) => (
                    <tr key={r.slNo}>
                      <td className="p-2 text-center font-mono font-bold border-r border-black">{r.slNo}</td>
                      <td className="p-2 text-center font-mono font-bold border-r border-black">{r.kpclCode || '-'}</td>
                      <td className="p-2 font-bold border-r border-black">{r.itemName}</td>
                      <td className="p-2 border-r border-black text-[10px] font-mono whitespace-pre-wrap">
                        {r.specifications}
                        {r.partNumber && <div className="mt-0.5 font-bold text-blue-900">Part No: {r.partNumber}</div>}
                      </td>
                      <td className="p-2 text-center font-mono border-r border-black">{r.unit}</td>
                      <td className="p-2 text-center font-mono font-bold border-r border-black">{r.qty}</td>
                      <td className="p-2 text-right font-mono font-bold border-r border-black">{fmt(r.rate)}</td>
                      <td className="p-2 text-right font-mono font-bold">{fmt(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 6. TAX TOTALS SUMMARY */}
            <div className="flex justify-end mt-4">
              <div className="w-80 border-2 border-black divide-y divide-black text-[11px] bg-slate-50/50">
                <div className="p-2 flex justify-between">
                  <span className="font-semibold">Basic Amount:</span>
                  <span className="font-mono font-bold">₹{fmt(totalBasic)}</span>
                </div>
                {(totalCgst > 0 || totalSgst > 0) ? (
                  <>
                    <div className="p-2 flex justify-between">
                      <span>CGST ({effectiveCgstPercent}%):</span>
                      <span className="font-mono font-bold">₹{fmt(totalCgst)}</span>
                    </div>
                    <div className="p-2 flex justify-between">
                      <span>SGST ({effectiveSgstPercent}%):</span>
                      <span className="font-mono font-bold">₹{fmt(totalSgst)}</span>
                    </div>
                  </>
                ) : totalIgst > 0 ? (
                  <div className="p-2 flex justify-between">
                    <span>IGST ({effectiveIgstPercent}%):</span>
                    <span className="font-mono font-bold">₹{fmt(totalIgst)}</span>
                  </div>
                ) : null}
                {totalShipping > 0 && (
                  <div className="p-2 flex justify-between text-blue-900 font-semibold">
                    <span>Shipping Charges:</span>
                    <span className="font-mono font-bold">+₹{fmt(totalShipping)}</span>
                  </div>
                )}
                <div className="p-2.5 flex justify-between bg-blue-50/80 font-black text-xs border-t-2 border-black">
                  <span className="text-[#1e3a8a]">TOTAL AMOUNT:</span>
                  <span className="font-mono text-sm text-[#1e3a8a]">₹{fmt(totalInvoiceAmount)}</span>
                </div>
              </div>
            </div>

            {/* 7. SIGNATURES */}
            <div className="flex justify-between items-end mt-12 pt-4 text-xs font-bold border-t border-slate-200">
              <div>
                <div className="w-48 border-b border-black mb-2"></div>
                <div>{isInward ? 'Received By (Stores / Site)' : 'Receiver\'s Signature with Seal'}</div>
              </div>
              <div className="text-center">
                <div>For SRI KRISHNA CONSTRUCTIONS</div>
                <div className="w-48 border-b border-black mt-8 mb-1 mx-auto"></div>
                <div className="font-normal text-slate-600 text-[11px]">{isInward ? 'Verified & Approved Signatory' : 'Authorised Signatory'}</div>
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM MODAL FOOTER BAR (MATCHES EXACT SALARY SLIP ACTION BAR) */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Invoice No: <strong className="font-mono text-slate-800">{invoiceNo}</strong> • Amount: <strong className="font-mono text-slate-800">₹{fmt(totalInvoiceAmount)}</strong>
          </span>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1.5 border border-slate-300 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={downloadPdf}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
