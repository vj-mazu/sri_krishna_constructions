import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
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

    const rawDiscription = s.itemName || itm.itemName || s.description || 'ITEM';
    let fullSpecs = itm.specifications || s.specifications || s.description || s.remarks || '';
    if (!fullSpecs) {
      if (itm.partNumber || s.partNumber) {
        fullSpecs = `${rawDiscription} MAKE- ${itm.make || 'KIRLOSKAR'}, P NO: ${itm.partNumber || s.partNumber}`;
      } else {
        fullSpecs = rawDiscription;
      }
    }

    return {
      slNo: idx + 1,
      kpclCode: itm.kpclCode || s.kpclCode || '-',
      itemName: rawDiscription,
      specifications: fullSpecs,
      partNumber: itm.partNumber || s.partNumber || s.receivedPartNumber || '',
      unit: itm.unit || s.unit || "No's",
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

  // Number to Indian Rupees words converter
  const numberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      let str = '';
      if (n > 9999999) {
        str += inWords(Math.floor(n / 10000000)) + 'Crore ';
        n %= 10000000;
      }
      if (n > 99999) {
        str += inWords(Math.floor(n / 100000)) + 'Lakh ';
        n %= 100000;
      }
      if (n > 999) {
        str += inWords(Math.floor(n / 1000)) + 'Thousand ';
        n %= 1000;
      }
      if (n > 99) {
        str += inWords(Math.floor(n / 100)) + 'Hundred ';
        n %= 100;
      }
      if (n > 0) {
        if (n < 20) {
          str += a[n];
        } else {
          str += b[Math.floor(n / 10)] + (n % 10 > 0 ? ' ' + a[n % 10] : ' ');
        }
      }
      return str;
    };

    const whole = Math.floor(num);
    const fraction = Math.round((num - whole) * 100);
    let result = inWords(whole) || 'Zero ';
    result = 'INR ' + result.trim() + ' Rupees';
    if (fraction > 0) {
      result += ' and ' + inWords(fraction).trim() + ' Paise';
    }
    return result + ' Only';
  };

  const amountInWordsText = numberToWords(totalInvoiceAmount);

  const effectiveCgstPercent = primarySale.cgstPercent !== undefined ? Number(primarySale.cgstPercent) : (itemsRows[0]?.cgstPercent || 0);
  const effectiveSgstPercent = primarySale.sgstPercent !== undefined ? Number(primarySale.sgstPercent) : (itemsRows[0]?.sgstPercent || 0);
  const effectiveIgstPercent = primarySale.igstPercent !== undefined ? Number(primarySale.igstPercent) : (itemsRows[0]?.igstPercent || 0);

  const downloadPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2); // 190mm

      let y = 8;

      // 1. TOP HEADER BOX WITH BORDER, LOGO & COMPANY INFO
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.rect(margin, y, contentWidth, 24);

      if (SKC_LOGO_BASE64) {
        try {
          doc.addImage(SKC_LOGO_BASE64, 'PNG', margin + 2, y + 2, 20, 20);
        } catch (e) {
          console.warn('Logo render fallback:', e);
        }
      }

      // Title text: SRI KRISHNA CONSTRUCTIONS (Bold Red Serif)
      doc.setTextColor(218, 18, 18);
      doc.setFont('times', 'bold');
      doc.setFontSize(18);
      doc.text('SRI KRISHNA CONSTRUCTIONS', pageWidth / 2, y + 6.5, { align: 'center' });

      // Subtitle & Address
      doc.setTextColor(0, 0, 0);
      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.text('H.no 2436 Raghavendra Colony Shaktinagar Raichur Karnataka-584170', pageWidth / 2, y + 11.5, { align: 'center' });
      
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.text('All type of air compressor Service and Spares Avaliable.', pageWidth / 2, y + 16.5, { align: 'center' });

      // GST and Mobile Bar
      doc.setFont('times', 'bold');
      doc.setFontSize(8);
      doc.text('GST NO: 29DWKPP3582H1ZV', margin + 2, y + 21.5);
      doc.text('Mobile No: 8496841904', pageWidth - margin - 2, y + 21.5, { align: 'right' });

      y += 24;

      // 2. BOXED TAX INVOICE TITLE
      doc.rect(margin, y, contentWidth, 7);
      doc.setFontSize(13);
      doc.setFont('times', 'bold');
      doc.text(isInward ? 'INWARD MATERIAL RECEIPT' : 'TAX INVOICE', pageWidth / 2, y + 5.2, { align: 'center' });
      y += 7;

      // 3. TWO-COLUMN INVOICE & DISPATCH DETAILS GRID (EXACT LAYOUT AS PER USER PDF)
      const boxHeight = 52;
      const colHalf = contentWidth / 2;

      doc.rect(margin, y, contentWidth, boxHeight);
      doc.line(margin + colHalf, y, margin + colHalf, y + boxHeight); // vertical center divider

      // Left Column items
      doc.setFont('times', 'bold');
      doc.setFontSize(8);
      let ly = y + 4.5;
      doc.text(`INVOICE NO: ${invoiceNo}`, margin + 2, ly);
      doc.line(margin, ly + 2, margin + colHalf, ly + 2);

      ly += 6.5;
      doc.text(`INVOICE DATE: ${invoiceDate}`, margin + 2, ly);
      doc.line(margin, ly + 2, margin + colHalf, ly + 2);

      ly += 5.5;
      const supplyToText = primarySale.placeOfWork || partyName || '-';
      doc.text(`SUPPLY To : ${supplyToText}`, margin + 2, ly);
      doc.setFont('times', 'normal');
      doc.setFontSize(7.5);
      
      if (partyAddress) {
        const addressLines = doc.splitTextToSize(partyAddress, colHalf - 4);
        doc.text(addressLines.slice(0, 4), margin + 2, ly + 4.5);
      } else if (partyName && partyName !== '-' && partyName !== 'Customer' && partyName !== 'Supplier') {
        doc.text(`Party: ${partyName}`, margin + 2, ly + 4.5);
      }
      
      doc.setFont('times', 'bold');
      doc.setFontSize(8);
      doc.text(`GST NO: ${partyGst || '-'}`, margin + 2, ly + 20);
      doc.line(margin, ly + 22, margin + colHalf, ly + 22);

      const divLabel = primarySale.divisionName || primarySale.purchaseOrder?.division?.name || primarySale.remarks || '-';
      doc.text(`Division: ${divLabel}`, margin + 2, ly + 27);

      // Right Column items
      let ry = y + 4.5;
      doc.setFont('times', 'bold');
      doc.setFontSize(8);
      doc.text(`${refLabel}: ${refNumber}`, margin + colHalf + 2, ry);
      doc.line(margin + colHalf, ry + 2, margin + contentWidth, ry + 2);

      ry += 6.5;
      doc.text(`${dateLabel}: ${refDate}`, margin + colHalf + 2, ry);
      doc.line(margin + colHalf, ry + 2, margin + contentWidth, ry + 2);

      ry += 5.5;
      doc.text(`State of Supply: ${primarySale.stateOfSupply || 'KARNATAKA'}`, margin + colHalf + 2, ry);
      doc.setFont('times', 'normal');
      doc.setFontSize(7.5);

      const shippedToText = primarySale.shippedTo || partyAddress || partyName || '-';
      const shipLines = doc.splitTextToSize(`Shipped To: ${shippedToText}`, colHalf - 4);
      doc.text(shipLines.slice(0, 4), margin + colHalf + 2, ry + 4.5);
      
      doc.setFont('times', 'bold');
      doc.setFontSize(8);
      doc.text(`GST NO: ${partyGst || '-'}`, margin + colHalf + 2, ry + 20);
      doc.line(margin + colHalf, ry + 22, margin + contentWidth, ry + 22);

      const vehicleLine = `Vehicle No : ${primarySale.vehicleNumber || '-'}`;
      doc.text(vehicleLine, margin + colHalf + 2, ry + 27);

      y += boxHeight;

      // 4. INVOICE ITEMS TABLE (EXACT AUTOTABLE MATCHING USER'S PDF)
      const tableBody = itemsRows.map((r) => [
        r.slNo.toString(),
        r.kpclCode || '-',
        r.itemName,
        `${r.specifications}${r.partNumber && !r.specifications.includes(r.partNumber) ? `\nP NO: ${r.partNumber}` : ''}`,
        r.unit === 'NOS' ? "No's" : (r.unit || "No's"),
        r.qty.toString(),
        fmt(r.rate),
        fmt(r.amount)
      ]);

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [
          ['SL\nNO', 'KPCL ITEM\nCODE', 'Discription', 'ITEM NAME &\nSPECIFICATION', 'UNIT', 'QTY', 'PRICE', 'AMOUNT']
        ],
        body: tableBody,
        theme: 'grid',
        styles: {
          font: 'times',
          fontSize: 7.5,
          lineColor: [0, 0, 0],
          lineWidth: 0.35,
          textColor: [0, 0, 0],
          cellPadding: 1.8,
          valign: 'middle'
        },
        headStyles: {
          font: 'times',
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.4,
          lineColor: [0, 0, 0]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10, fontStyle: 'bold' },
          1: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
          2: { cellWidth: 44, fontStyle: 'bold' },
          3: { cellWidth: 62 },
          4: { halign: 'center', cellWidth: 12 },
          5: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
          6: { halign: 'right', cellWidth: 13, fontStyle: 'bold' },
          7: { halign: 'right', cellWidth: 13, fontStyle: 'bold' }
        },
        didDrawPage: (data) => {
          // Page Number at bottom of every page
          const str = `Page ${doc.getNumberOfPages()} of `;
          doc.setFont('times', 'normal');
          doc.setFontSize(7.5);
          doc.text(str + '{total_pages_count_string}', pageWidth / 2, 290, { align: 'center' });
        }
      });

      if (typeof (doc as any).putTotalPages === 'function') {
        (doc as any).putTotalPages('{total_pages_count_string}');
      }

      const finalTableY = (doc as any).lastAutoTable?.finalY || (y + 40);

      // Check if space is sufficient on current page for totals box (needs ~55mm)
      let fy = finalTableY;
      if (fy > 230) {
        doc.addPage();
        fy = 15;
      }

      // 5. BOTTOM TOTALS BOX & BANK DETAILS (EXACT AS USER PDF PAGE 4)
      const leftBoxWidth = 120;
      const rightBoxWidth = contentWidth - leftBoxWidth; // 70mm
      const bottomBoxHeight = 35;

      // Outer Box border
      doc.rect(margin, fy, contentWidth, bottomBoxHeight);
      doc.line(margin + leftBoxWidth, fy, margin + leftBoxWidth, fy + bottomBoxHeight); // vertical divider

      // Left Box: Total Invoice amount in words + Bank Details
      doc.setFont('times', 'bold');
      doc.setFontSize(7.5);
      doc.text('Total Invoice amount in words: ', margin + 2, fy + 4.5);
      doc.setFont('times', 'normal');
      const inWordsClean = amountInWordsText.replace(/^INR\s*/i, '').replace(/Rupees/i, 'Rupees').trim();
      const wordsLines = doc.splitTextToSize(inWordsClean, leftBoxWidth - 4);
      doc.text(wordsLines.slice(0, 2), margin + 2, fy + 8.5);

      doc.line(margin, fy + 12.5, margin + leftBoxWidth, fy + 12.5);

      doc.setFont('times', 'bold');
      doc.text('Bank Details :', margin + 2, fy + 16.5);
      doc.setFont('times', 'normal');
      doc.text('Account Holder Name : Sri Krishna Constructions', margin + 2, fy + 20.5);
      doc.text('Bank Name : Canara Bank Deosugur Branch', margin + 2, fy + 24.5);
      doc.text('Bank Account No: 18133070005349', margin + 2, fy + 28.5);
      doc.text('IFSC Code:CNRB0011813', margin + 2, fy + 32.5);

      // Right Box: Basic Cost, SGST 9%, CGST 9%, TOTAL TAX AMOUNT, TOTAL AMOUNT
      const rightX = margin + leftBoxWidth;
      const valX = margin + contentWidth - 2;

      // Row 1: Basic Cost
      doc.setFont('times', 'bold');
      doc.setFontSize(7.5);
      doc.text('Basic Cost', rightX + 2, fy + 5.5);
      doc.text(fmt(totalBasic), valX, fy + 5.5, { align: 'right' });
      doc.line(rightX, fy + 7, margin + contentWidth, fy + 7);

      // Row 2: SGST 9%
      doc.text(`SGST ${effectiveSgstPercent || 9}%`, rightX + 2, fy + 12.5);
      doc.text(fmt(totalSgst), valX, fy + 12.5, { align: 'right' });
      doc.line(rightX, fy + 14, margin + contentWidth, fy + 14);

      // Row 3: CGST 9%
      doc.text(`CGST ${effectiveCgstPercent || 9}%`, rightX + 2, fy + 19.5);
      doc.text(fmt(totalCgst), valX, fy + 19.5, { align: 'right' });
      doc.line(rightX, fy + 21, margin + contentWidth, fy + 21);

      // Row 4: TOTAL TAX AMOUNT
      const totalTax = round2(totalCgst + totalSgst + totalIgst);
      doc.text('TOTAL TAX AMOUNT', rightX + 2, fy + 26.5);
      doc.text(fmt(totalTax), valX, fy + 26.5, { align: 'right' });
      doc.line(rightX, fy + 28, margin + contentWidth, fy + 28);

      // Row 5: TOTAL AMOUNT
      doc.text('TOTAL AMOUNT', rightX + 2, fy + 33.5);
      doc.text(fmt(totalInvoiceAmount), valX, fy + 33.5, { align: 'right' });

      // Signatures
      let sigY = fy + bottomBoxHeight + 8;
      if (sigY > 270) {
        doc.addPage();
        sigY = 20;
      }
      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.text('Your Faithfully', pageWidth - margin - 20, sigY, { align: 'center' });
      doc.setFont('times', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text('For Sri Krishna Constructions', pageWidth - margin - 20, sigY + 6, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.setFont('times', 'normal');
      doc.text('Proprietor', pageWidth - margin - 20, sigY + 16, { align: 'center' });

      doc.save(`${isInward ? 'INWARD_RECEIPT' : 'TAX_INVOICE'}_${invoiceNo.replaceAll('/', '_')}.pdf`);
      showToast('Tax Invoice PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('Failed to generate Tax Invoice PDF:', error);
      showToast('Error generating PDF. Please check console for details.', 'error');
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[999999] flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* CLEAN ENTERPRISE MODAL CONTAINER */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-300 flex flex-col h-[90vh] max-h-[90vh] overflow-hidden animate-fadeIn relative z-[1000000]">
        
        {/* MODAL TOP HEADER BAR */}
        <div className="bg-[#1e3a8a] text-white px-4 py-3 sm:px-6 sm:py-3.5 flex justify-between items-center shrink-0 border-b border-blue-950">
          <div className="flex items-center gap-2.5 min-w-0">
            <Printer className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base truncate">
                {isInward ? 'Inward Material Receipt / Invoice' : 'Tax Invoice'} • {invoiceNo}
              </h3>
              <p className="text-[10px] sm:text-xs text-blue-200 truncate">
                {itemsRows.length} item{itemsRows.length > 1 ? 's' : ''} • Date: {invoiceDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={downloadPdf}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer"
              title="Download Portrait PDF"
            >
              <Download className="w-4 h-4" /> Download PDF
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
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-3 sm:p-6 bg-slate-100 flex justify-center">
          <div className="bg-white p-4 sm:p-8 rounded-xl shadow-md border border-slate-300 w-full max-w-4xl text-black font-sans text-xs self-start my-1 sm:my-3">
            
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
                  <div className="font-bold">{isInward ? 'SUPPLIER / PARTY' : 'SUPPLY To'} : {primarySale.placeOfWork || partyName}</div>
                  {partyAddress ? (
                    <div className="text-[10px] text-slate-700 whitespace-pre-wrap">{partyAddress}</div>
                  ) : (
                    <div className="text-[10px] text-slate-700">{partyName || '-'}</div>
                  )}
                  <div className="font-bold mt-1">GST NO: {partyGst || '-'}</div>
                  <div className="font-bold mt-1">Division: {primarySale.divisionName || primarySale.purchaseOrder?.division?.name || primarySale.remarks || '-'}</div>
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
                  <div className="font-bold">{isInward ? 'DELIVERED TO (RECEIVER):' : 'State of Supply: KARNATAKA'}</div>
                  {isInward ? (
                    <>
                      <div className="text-[10px] text-slate-700 font-bold">SRI KRISHNA CONSTRUCTIONS</div>
                      <div className="text-[10px] text-slate-700">#2436, Raghavendar Colony, Shaktinagar - 584170</div>
                      <div className="text-[10px] text-slate-700">Raichur Dist, Karnataka</div>
                      <div className="font-bold mt-1">GST NO: 29DWKPP3582H1ZV</div>
                    </>
                  ) : (
                    <>
                      <div className="text-[10px] text-slate-700 font-bold">Shipped To: {primarySale.shippedTo || partyName || '-'}</div>
                      {partyAddress && <div className="text-[10px] text-slate-700 whitespace-pre-wrap">{partyAddress}</div>}
                      <div className="font-bold mt-2">GST NO: {partyGst || '-'}</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 5. TAX INVOICE ITEMS TABLE */}
            <div className="mt-3 border border-black overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse font-serif">
                <thead>
                  <tr className="border-b border-black text-center font-bold bg-slate-50">
                    <th className="p-2 border-r border-black w-12">SL NO</th>
                    <th className="p-2 border-r border-black w-24">KPCL ITEM CODE</th>
                    <th className="p-2 border-r border-black w-36">Discription</th>
                    <th className="p-2 border-r border-black min-w-[200px]">ITEM NAME & SPECIFICATION</th>
                    <th className="p-2 border-r border-black w-14">UNIT</th>
                    <th className="p-2 border-r border-black w-14">QTY</th>
                    <th className="p-2 border-r border-black w-20 text-right">PRICE (₹)</th>
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

            {/* 6. TAX TOTALS & AMOUNT IN WORDS & BANK DETAILS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {/* Left Box: Amount in words & Bank info */}
              <div className="border border-black p-2.5 text-[10px] sm:text-[11px] space-y-2 bg-slate-50/50">
                <div>
                  <span className="font-bold block text-slate-900">Total Invoice amount in words:</span>
                  <span className="font-serif italic font-bold text-slate-800 text-[11px] block mt-0.5">
                    {amountInWordsText}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-300">
                  <span className="font-bold block text-slate-900">Bank Details:</span>
                  <div className="text-[10px] text-slate-700 space-y-0.5 mt-0.5">
                    <div>Account Holder: <strong>SRI KRISHNA CONSTRUCTIONS</strong></div>
                    <div>Bank Name: <strong>Canara Bank</strong>, Deosugur Branch</div>
                    <div>A/C No: <strong className="font-mono">18133070005349</strong></div>
                    <div>IFSC Code: <strong className="font-mono">CNRB0011813</strong></div>
                  </div>
                </div>
                <div className="text-[9px] text-slate-500 pt-1">
                  Terms: Subject to Raichur Jurisdiction • E.&O.E. • Authenticated Tax Invoice.
                </div>
              </div>

              {/* Right Box: Tax Breakdown Summary */}
              <div className="border-2 border-black divide-y divide-black text-[11px] bg-slate-50/50">
                <div className="p-2 flex justify-between">
                  <span className="font-semibold">Basic Cost:</span>
                  <span className="font-mono font-bold">₹{fmt(totalBasic)}</span>
                </div>
                {(totalCgst > 0 || totalSgst > 0) ? (
                  <>
                    <div className="p-2 flex justify-between">
                      <span>SGST 9%:</span>
                      <span className="font-mono font-bold">₹{fmt(totalSgst)}</span>
                    </div>
                    <div className="p-2 flex justify-between">
                      <span>CGST 9%:</span>
                      <span className="font-mono font-bold">₹{fmt(totalCgst)}</span>
                    </div>
                    <div className="p-2 flex justify-between font-bold bg-slate-100/70">
                      <span>TOTAL TAX AMOUNT:</span>
                      <span className="font-mono">₹{fmt(totalCgst + totalSgst)}</span>
                    </div>
                  </>
                ) : totalIgst > 0 ? (
                  <>
                    <div className="p-2 flex justify-between">
                      <span>IGST 18%:</span>
                      <span className="font-mono font-bold">₹{fmt(totalIgst)}</span>
                    </div>
                    <div className="p-2 flex justify-between font-bold bg-slate-100/70">
                      <span>TOTAL TAX AMOUNT:</span>
                      <span className="font-mono">₹{fmt(totalIgst)}</span>
                    </div>
                  </>
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
                <div className="italic text-slate-700 font-serif">Your Faithfully</div>
                <div className="font-bold">For Sri Krishna Constructions</div>
                <div className="w-48 border-b border-black mt-8 mb-1 mx-auto"></div>
                <div className="font-bold text-slate-900 text-[11px] uppercase">{isInward ? 'Verified & Approved Signatory' : 'Proprietor'}</div>
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM MODAL FOOTER BAR */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2 shrink-0">
          <span className="text-xs text-slate-600 font-medium hidden sm:inline">
            Invoice No: <strong className="font-mono text-slate-900">{invoiceNo}</strong> • Total Amount: <strong className="font-mono text-emerald-800">₹{fmt(totalInvoiceAmount)}</strong>
          </span>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-300 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={downloadPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
