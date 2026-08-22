import React from 'react';
import { Download, Printer, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SKC_LOGO_BASE64 } from '../logoBase64';

export const SaleInvoiceModal: React.FC<{ sale: any | any[]; onClose: () => void }> = ({ sale, onClose }) => {
  if (!sale) return null;
  
  // Normalize to array of sales
  const salesList: any[] = Array.isArray(sale) ? sale : [sale];
  if (salesList.length === 0) return null;

  const primarySale = salesList[0];
  const invoiceNo = primarySale.invoiceNumber || primarySale.invoiceRefNo || `SKC/2025-26/${primarySale.id?.slice(0, 4) || '01'}`;
  const invoiceDate = primarySale.invoiceDate ? new Date(primarySale.invoiceDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  const poNumber = primarySale.poNumber || primarySale.purchaseOrder?.poNumber || 'EEP/EE(P)/2025-26/287/11289';
  const orderDate = primarySale.poDate ? new Date(primarySale.poDate).toLocaleDateString('en-GB') : (primarySale.purchaseOrder?.date ? new Date(primarySale.purchaseOrder.date).toLocaleDateString('en-GB') : '09/06/2025');

  // Format currency helper
  const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

  // Calculate totals across all items
  let totalBasic = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const itemsRows = salesList.map((s, idx) => {
    const itm = s.purchaseOrderItem || s.item || {};
    const q = Number(s.qty || s.quantity || 0);
    const r = Number(s.rate || s.unitPrice || 0);
    const b = q * r;
    const cg = b * (Number(s.cgstPercent || 0) / 100);
    const sg = b * (Number(s.sgstPercent || 0) / 100);
    const ig = b * (Number(s.igstPercent || 0) / 100);

    totalBasic += b;
    totalCgst += cg;
    totalSgst += sg;
    totalIgst += ig;

    return {
      slNo: idx + 1,
      kpclCode: itm.kpclCode || '635020105R',
      itemName: itm.itemName || 'PACKING (LP CYL. TO I/O COVER)',
      specifications: itm.specifications || 'GASKET/PACKING (LP CYLINDER TO I/O COVER) COMPRESSOR\nMAKE-KIRLOSKAR, Model:T-BTD-PM\nP.NO-2790010550\nMake : Kirloskar Equivalent',
      partNumber: itm.partNumber || s.partNumber || '',
      unit: itm.unit || "No's",
      qty: q,
      rate: r,
      amount: b
    };
  });

  const totalInvoiceAmount = Math.round(totalBasic + totalCgst + totalSgst + totalIgst);

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

      // 3. BOXED "TAX INVOICE" TITLE
      doc.rect(margin, y, contentWidth, 7.5);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TAX INVOICE', margin + (contentWidth / 2), y + 5.5, { align: 'center' });
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
      doc.text(`INVOICE NO: ${invoiceNo}`, margin + 2, ly);
      doc.line(margin, ly + 1.5, margin + colHalf, ly + 1.5);
      
      ly += 5;
      doc.text(`INVOICE DATE: ${invoiceDate}`, margin + 2, ly);
      doc.line(margin, ly + 1.5, margin + colHalf, ly + 1.5);

      ly += 4.5;
      doc.text(`SUPPLY To : ${primarySale.partyName || 'SHAKTINAGAR'}`, margin + 2, ly);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.text(`TO Paying Authority: Deputy General Manager(F)RTPS`, margin + 2, ly + 3.8);
      doc.text(`Raichur Thermal Power Station (RTPS),KPCL`, margin + 2, ly + 7.2);
      doc.text(`Plant Premises, Shaktinagara, PIN-584170`, margin + 2, ly + 10.6);
      doc.text(`Phone 9449596504 Fax 8532247846`, margin + 2, ly + 14.0);
      doc.setFont('helvetica', 'bold');
      doc.text(`GST NO: ${primarySale.gstNumber || '29AAACK8032D1ZQ'}`, margin + 2, ly + 17.5);
      doc.line(margin, ly + 19, margin + colHalf, ly + 19);

      doc.setFontSize(7.2);
      doc.text(`Vehicle No : ${primarySale.vehicleNumber || 'KA 36C 2722'}`, margin + 2, ly + 23.5);

      // Right Column items
      let ry = y + 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.text(`PO No: ${poNumber}`, margin + colHalf + 2, ry);
      doc.line(margin + colHalf, ry + 1.5, margin + contentWidth, ry + 1.5);

      ry += 5;
      doc.text(`Order Date: ${orderDate}`, margin + colHalf + 2, ry);
      doc.line(margin + colHalf, ry + 1.5, margin + contentWidth, ry + 1.5);

      ry += 4.5;
      doc.text(`State of Supply: KARNATAKA`, margin + colHalf + 2, ry);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.text(`Shipped To: Executive Engineer(Stores) Raichur Thermal`, margin + colHalf + 2, ry + 3.8);
      doc.text(`Power Station (RTPS),KPCL Plant Premises,`, margin + colHalf + 2, ry + 7.2);
      doc.text(`Shaktinagara, PIN-584170`, margin + colHalf + 2, ry + 10.6);
      doc.setFont('helvetica', 'bold');
      doc.text(`GST NO: ${primarySale.gstNumber || '29AAACK8032D1ZQ'}`, margin + colHalf + 2, ry + 17.5);

      y += boxHeight;

      // 5. TAX INVOICE ITEMS TABLE (EXACT EXCEL / PHOTO LAYOUT)
      const tableBody = itemsRows.map((r) => [
        r.slNo.toString(),
        r.kpclCode,
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
          ['SI.\nNO', 'KPCL ITEM\nCODE', 'Discription', 'ITEM NAME &\nSPECIFICATION', 'UNIT', 'QTY', 'PRICE', 'AMOUNT']
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
          1: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
          2: { cellWidth: 32, fontStyle: 'bold' },
          3: { cellWidth: 64 },
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
      doc.rect(margin + 105, fy, 81, 24);
      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'normal');
      doc.text(`Basic Amount:`, margin + 107, fy + 4.5);
      doc.text(`₹${fmt(totalBasic)}`, margin + 184, fy + 4.5, { align: 'right' });

      if (totalCgst > 0 || totalSgst > 0) {
        doc.text(`CGST (${primarySale.cgstPercent || 9}%):`, margin + 107, fy + 9);
        doc.text(`₹${fmt(totalCgst)}`, margin + 184, fy + 9, { align: 'right' });

        doc.text(`SGST (${primarySale.sgstPercent || 9}%):`, margin + 107, fy + 13.5);
        doc.text(`₹${fmt(totalSgst)}`, margin + 184, fy + 13.5, { align: 'right' });
      } else if (totalIgst > 0) {
        doc.text(`IGST (${primarySale.igstPercent || 18}%):`, margin + 107, fy + 9);
        doc.text(`₹${fmt(totalIgst)}`, margin + 184, fy + 9, { align: 'right' });
      }

      doc.line(margin + 105, fy + 16.5, margin + 186, fy + 16.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`TOTAL AMOUNT:`, margin + 107, fy + 21);
      doc.text(`₹${fmt(totalInvoiceAmount)}`, margin + 184, fy + 21, { align: 'right' });

      // Signature blocks
      const sigY = fy + 32;
      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'normal');
      doc.text('Receiver\'s Signature with Seal', margin + 6, sigY);

      doc.setFont('helvetica', 'bold');
      doc.text('For SRI KRISHNA CONSTRUCTIONS', margin + 120, sigY - 7);
      doc.setFont('helvetica', 'normal');
      doc.text('Authorised Signatory', margin + 135, sigY);

      doc.setFontSize(6.5);
      doc.text('Page 1 of 1', pageWidth / 2, 288, { align: 'center' });

      doc.save(`TAX_INVOICE_${invoiceNo.replaceAll('/', '_')}.pdf`);
    } catch (error) {
      console.error('Failed to generate Tax Invoice PDF:', error);
      alert('Error generating PDF. Please check console for details.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden relative z-[10000] border-2 border-slate-300">
        
        {/* MODAL TOP CONTROL BAR */}
        <div className="bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] text-white px-5 py-3 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base tracking-wide flex items-center gap-2">
              📄 Tax Invoice Preview: <span className="font-mono text-sky-200">{invoiceNo}</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-normal">
                {itemsRows.length} item{itemsRows.length > 1 ? 's' : ''} selected
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={downloadPdf}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" /> Download Official PDF
            </button>
            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-rose-600 text-white flex items-center justify-center transition-all ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AUTHENTIC TAX INVOICE SHEET (MATCHING PHOTO EXACTLY) */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100 flex justify-center">
          <div className="bg-white p-6 sm:p-8 rounded shadow-lg border border-slate-400 w-full max-w-3xl text-black font-sans text-xs">
            
            {/* 1. TOP HEADER WITH ORIGINAL RED LOGO */}
            <div className="flex items-start gap-4 pb-3 border-b-2 border-black">
              <img 
                src={SKC_LOGO_BASE64 || '/skc_logo.png'} 
                alt="SKC Logo" 
                className="w-20 h-20 object-contain shrink-0" 
              />
              <div className="flex-1 text-center pr-6">
                <h1 className="text-xl sm:text-2xl font-black text-red-600 tracking-wide uppercase leading-tight font-serif">
                  SRI KRISHNA CONSTRUCTIONS
                </h1>
                <p className="text-[11px] font-bold text-slate-900 mt-1">
                  All Types of Compressor Spares and Service , Pipe Line Work , Heavy Fabrication Works
                </p>
                <p className="text-[10px] text-slate-800 mt-0.5">
                  # 2436, Raghavendar Colony, SHAKTINAGAR - 584 170. Raichur Dist. (Karnataka)
                </p>
                <div className="text-[10px] font-bold text-slate-900 mt-1 flex justify-end">
                  <span>SUNIL: 8496841904</span>
                </div>
              </div>
            </div>

            {/* 2. REGISTRATION BAR */}
            <div className="flex justify-between items-center py-1.5 px-2 border-b-2 border-black font-bold text-[11px]">
              <span>GSTIN : 29DWKPP3582H1ZV</span>
              <span>PAN No. DWKPP3582H</span>
              <span>PF No. GBRCH1955403000</span>
            </div>

            {/* 3. TAX INVOICE TITLE BOX */}
            <div className="border border-black my-2.5 py-1.5 text-center font-serif font-black text-base sm:text-lg uppercase tracking-widest bg-slate-50">
              TAX INVOICE
            </div>

            {/* 4. TWO-COLUMN INVOICE & DISPATCH DETAILS */}
            <div className="border border-black grid grid-cols-2 text-[11px]">
              {/* Left Column */}
              <div className="border-r border-black divide-y divide-black">
                <div className="p-1.5 font-bold">
                  INVOICE NO: <span className="font-mono">{invoiceNo}</span>
                </div>
                <div className="p-1.5 font-bold">
                  INVOICE DATE: <span className="font-mono">{invoiceDate}</span>
                </div>
                <div className="p-1.5 space-y-0.5 min-h-[90px]">
                  <div className="font-bold">SUPPLY To : {primarySale.partyName || 'SHAKTINAGAR'}</div>
                  <div className="text-[10px] text-slate-700">TO Paying Authority: Deputy General Manager(F)RTPS</div>
                  <div className="text-[10px] text-slate-700">Raichur Thermal Power Station (RTPS),KPCL</div>
                  <div className="text-[10px] text-slate-700">Plant Premises, Shaktinagara, PIN-584170</div>
                  <div className="text-[10px] text-slate-700">Phone 9449596504 Fax 8532247846</div>
                  <div className="font-bold mt-1">GST NO: {primarySale.gstNumber || '29AAACK8032D1ZQ'}</div>
                </div>
                <div className="p-1.5 font-bold">
                  Vehicle No : <span className="font-mono uppercase">{primarySale.vehicleNumber || 'KA 36C 2722'}</span>
                </div>
              </div>

              {/* Right Column */}
              <div className="divide-y divide-black">
                <div className="p-1.5 font-bold">
                  PO No: <span className="font-mono">{poNumber}</span>
                </div>
                <div className="p-1.5 font-bold">
                  Order Date: <span className="font-mono">{orderDate}</span>
                </div>
                <div className="p-1.5 space-y-0.5 min-h-[90px]">
                  <div className="font-bold">State of Supply: KARNATAKA</div>
                  <div className="text-[10px] text-slate-700">Shipped To: Executive Engineer(Stores) Raichur Thermal</div>
                  <div className="text-[10px] text-slate-700">Power Station (RTPS),KPCL Plant Premises,</div>
                  <div className="text-[10px] text-slate-700">Shaktinagara, PIN-584170</div>
                  <div className="font-bold mt-2">GST NO: {primarySale.gstNumber || '29AAACK8032D1ZQ'}</div>
                </div>
              </div>
            </div>

            {/* 5. TAX INVOICE ITEMS TABLE */}
            <div className="mt-3 border border-black overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-black text-center font-bold bg-slate-50">
                    <th className="p-2 border-r border-black w-10">SI. NO</th>
                    <th className="p-2 border-r border-black w-28">KPCL ITEM CODE</th>
                    <th className="p-2 border-r border-black">Discription</th>
                    <th className="p-2 border-r border-black min-w-[180px]">ITEM NAME & SPECIFICATION</th>
                    <th className="p-2 border-r border-black w-14">UNIT</th>
                    <th className="p-2 border-r border-black w-14">QTY</th>
                    <th className="p-2 border-r border-black w-20">PRICE</th>
                    <th className="p-2 w-24 text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {itemsRows.map((r) => (
                    <tr key={r.slNo}>
                      <td className="p-2 text-center font-mono font-bold border-r border-black">{r.slNo}</td>
                      <td className="p-2 text-center font-mono font-bold border-r border-black">{r.kpclCode}</td>
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
            <div className="flex justify-end mt-3">
              <div className="w-72 border border-black divide-y divide-black text-[11px]">
                <div className="p-1.5 flex justify-between">
                  <span>Basic Amount:</span>
                  <span className="font-mono font-bold">₹{fmt(totalBasic)}</span>
                </div>
                {totalCgst > 0 && (
                  <div className="p-1.5 flex justify-between">
                    <span>CGST ({primarySale.cgstPercent || 9}%):</span>
                    <span className="font-mono font-bold">₹{fmt(totalCgst)}</span>
                  </div>
                )}
                {totalSgst > 0 && (
                  <div className="p-1.5 flex justify-between">
                    <span>SGST ({primarySale.sgstPercent || 9}%):</span>
                    <span className="font-mono font-bold">₹{fmt(totalSgst)}</span>
                  </div>
                )}
                {totalIgst > 0 && (
                  <div className="p-1.5 flex justify-between">
                    <span>IGST ({primarySale.igstPercent || 18}%):</span>
                    <span className="font-mono font-bold">₹{fmt(totalIgst)}</span>
                  </div>
                )}
                <div className="p-2 flex justify-between bg-slate-50 font-black text-xs">
                  <span>TOTAL AMOUNT:</span>
                  <span className="font-mono text-sm text-blue-900">₹{fmt(totalInvoiceAmount)}</span>
                </div>
              </div>
            </div>

            {/* 7. SIGNATURES */}
            <div className="flex justify-between items-end mt-16 pt-4 text-xs font-bold">
              <div>Receiver's Signature with Seal</div>
              <div className="text-center">
                <div>For SRI KRISHNA CONSTRUCTIONS</div>
                <div className="mt-8 font-normal text-slate-600">Authorised Signatory</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
