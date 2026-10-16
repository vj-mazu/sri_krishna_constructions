import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Printer, X, Edit3, RotateCcw, Building2, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SKC_LOGO_BASE64 } from '../logoBase64';
import { showToast } from '../toast';

interface CustomInvoiceSettings {
  companyName: string;
  companyAddress: string;
  companyTagline: string;
  companyGst: string;
  companyPhone: string;
  bankHolder: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  signatoryTitle: string;
  signatoryDesignation: string;
  stateOfSupply?: string;
  supplyTo?: string;
  gstRounding?: 'up' | 'nearest';
  showEwayBill?: boolean;
  repeatColumnHeaders?: boolean;
  numberStyle?: 'plain' | 'formatted';
}

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
  const invoiceNo = isInward
    ? (primarySale.partyInvoiceNumber || primarySale.invoiceNumber || `SKC/INW/${primarySale.id?.slice(0, 4) || '01'}`)
    : (primarySale.invoiceNumber || primarySale.partyInvoiceNumber || primarySale.invoiceRefNo || `SKC/2026-27/${primarySale.id?.slice(0, 4) || '01'}`);
  
  const invoiceDate = primarySale.invoiceDate 
    ? new Date(primarySale.invoiceDate).toLocaleDateString('en-GB') 
    : (primarySale.supplierInvoiceDate 
      ? new Date(primarySale.supplierInvoiceDate).toLocaleDateString('en-GB')
      : (primarySale.date ? new Date(primarySale.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')));
  
  // Dynamic Reference: Work Order vs PO vs Inward vs Direct Sale
  const isWorkOrder = invoiceType === 'WORK_ORDER' || primarySale.sourceType === 'WORK_ORDER' || (!!primarySale.workOrderNumber && primarySale.workOrderNumber !== '-' && primarySale.workOrderNumber.trim() !== '');
  const isPo = !isWorkOrder && (primarySale.sourceType === 'PO' || !!(primarySale.purchaseOrder?.poNumber || (primarySale.poNumber && primarySale.poNumber !== '-' && primarySale.poNumber.trim() !== '')));
  
  const refLabel = isInward 
    ? (isPo ? 'PO No' : 'Supplier Inv No') 
    : (isWorkOrder ? 'WO No' : (isPo ? 'PO No' : 'Ref No'));

  const refNumber = isInward 
    ? (primarySale.purchaseOrder?.poNumber || primarySale.poNumber || primarySale.partyInvoiceNumber || '-')
    : (isWorkOrder 
      ? (primarySale.workOrderNumber || primarySale.poNumber || '-') 
      : (primarySale.purchaseOrder?.poNumber || primarySale.poNumber || '-'));
  
  const dateLabel = isInward 
    ? (isPo ? 'PO Date' : 'Supplier Inv Date') 
    : (isWorkOrder ? 'WO Date' : (isPo ? 'PO Date' : 'Order Date'));

  const rawRefDate = isInward
    ? (primarySale.purchaseOrder?.date || primarySale.poDate || primarySale.supplierInvoiceDate || primarySale.invoiceDate || primarySale.date)
    : (isWorkOrder 
      ? (primarySale.workOrderDate || primarySale.poDate) 
      : (primarySale.purchaseOrder?.date || primarySale.poDate || primarySale.date));
  const refDate = rawRefDate ? new Date(rawRefDate).toLocaleDateString('en-GB') : invoiceDate;

  // Party info
  const partyName = primarySale.partyName || primarySale.clientDepartment || primarySale.supplierName || (isInward ? 'Supplier' : 'Customer');
  const partyAddress = primarySale.partyAddress || primarySale.supplierAddress || primarySale.clientAddress || '';
  const partyGst = primarySale.gstNumber || primarySale.partyGstNumber || primarySale.clientGst || '';
  const eWayBillNo = primarySale.eWayBillNumber || primarySale.eWayBillNo || primarySale.ewayBillNumber || primarySale.ewayBillNo || salesList.find(s => s.eWayBillNumber || s.eWayBillNo)?.eWayBillNumber || '';
  const vehicleNo = primarySale.vehicleNumber || primarySale.vehicleNo || salesList.find(s => s.vehicleNumber || s.vehicleNo)?.vehicleNumber || '';
  const shippedToText = primarySale.shippedTo || partyAddress || partyName || '-';
  const rawDivision = (primarySale.divisionName && primarySale.divisionName !== '-' && primarySale.divisionName !== 'N/A')
    ? primarySale.divisionName
    : (primarySale.purchaseOrder?.division?.name && primarySale.purchaseOrder?.division?.name !== '-')
      ? primarySale.purchaseOrder.division.name
      : (primarySale.division && primarySale.division !== '-' && primarySale.division !== 'N/A')
        ? primarySale.division
        : '';
  const showDivision = Boolean(rawDivision && rawDivision.trim() !== '' && rawDivision.trim() !== '-');
  const divLabel = showDivision ? rawDivision.trim() : '';

  // Customizable Company & Bank Details state with localStorage caching
  const defaultSettings: CustomInvoiceSettings = {
    companyName: primarySale.companyName || 'SRI KRISHNA CONSTRUCTIONS',
    companyAddress: primarySale.companyAddress || 'H.no 2436 Raghavendra Colony Shaktinagar Raichur Karnataka-584170',
    companyTagline: 'All type of air compressor Service and Spares Avaliable.',
    companyGst: primarySale.companyGstNumber || '29DWKPP3582H1ZV',
    companyPhone: primarySale.companyPhone || '8496841904',
    bankHolder: 'Sri Krishna Constructions',
    bankName: 'Canara Bank Deosugur Branch',
    bankAccount: '18133070005349',
    bankIfsc: 'CNRB0011813',
    signatoryTitle: 'For Sri Krishna Constructions',
    signatoryDesignation: 'Proprietor',
    stateOfSupply: primarySale.stateOfSupply || 'KARNATAKA',
    supplyTo: primarySale.placeOfWork || primarySale.supplyTo || '',
    gstRounding: 'up',
    showEwayBill: false,
    repeatColumnHeaders: false,
    numberStyle: 'plain'
  };

  const [customSettings, setCustomSettings] = useState<CustomInvoiceSettings>(() => {
    const saved = localStorage.getItem('skc_invoice_custom_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          companyName: parsed.companyName !== undefined ? parsed.companyName : defaultSettings.companyName,
          companyAddress: parsed.companyAddress !== undefined ? parsed.companyAddress : defaultSettings.companyAddress,
          companyTagline: parsed.companyTagline !== undefined ? parsed.companyTagline : defaultSettings.companyTagline,
          companyGst: parsed.companyGst !== undefined ? parsed.companyGst : defaultSettings.companyGst,
          companyPhone: parsed.companyPhone !== undefined ? parsed.companyPhone : defaultSettings.companyPhone,
          bankHolder: parsed.bankHolder !== undefined ? parsed.bankHolder : defaultSettings.bankHolder,
          bankName: parsed.bankName !== undefined ? parsed.bankName : defaultSettings.bankName,
          bankAccount: parsed.bankAccount !== undefined ? parsed.bankAccount : defaultSettings.bankAccount,
          bankIfsc: parsed.bankIfsc !== undefined ? parsed.bankIfsc : defaultSettings.bankIfsc,
          signatoryTitle: parsed.signatoryTitle !== undefined ? parsed.signatoryTitle : defaultSettings.signatoryTitle,
          signatoryDesignation: parsed.signatoryDesignation !== undefined ? parsed.signatoryDesignation : defaultSettings.signatoryDesignation,
          stateOfSupply: parsed.stateOfSupply !== undefined ? parsed.stateOfSupply : defaultSettings.stateOfSupply,
          supplyTo: parsed.supplyTo !== undefined ? parsed.supplyTo : defaultSettings.supplyTo,
          gstRounding: parsed.gstRounding || 'up',
          showEwayBill: parsed.showEwayBill || false,
          repeatColumnHeaders: parsed.repeatColumnHeaders || false,
          numberStyle: parsed.numberStyle || 'plain'
        };
      } catch (_) {}
    }
    return defaultSettings;
  });

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempSettings, setTempSettings] = useState<CustomInvoiceSettings>(customSettings);

  const handleSaveSettings = () => {
    setCustomSettings(tempSettings);
    localStorage.setItem('skc_invoice_custom_settings', JSON.stringify(tempSettings));
    setShowSettingsModal(false);
    showToast('Invoice Header & Bank Details updated successfully', 'success');
  };

  const handleResetSettings = () => {
    setTempSettings(defaultSettings);
    setCustomSettings(defaultSettings);
    localStorage.removeItem('skc_invoice_custom_settings');
    setShowSettingsModal(false);
    showToast('Invoice Header reset to system default', 'info');
  };

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

  // For WORK_ORDER invoices, determine the master KPCL code from the first item's workOrderNumber
  const isWorkOrderInvoice = invoiceType === 'WORK_ORDER' || primarySale.sourceType === 'WORK_ORDER' || (!!primarySale.workOrderNumber && primarySale.workOrderNumber !== '-' && primarySale.workOrderNumber.trim() !== '');
  let masterKpclCode = '';
  if (isWorkOrderInvoice && salesList.length > 0) {
    // Find the master KPCL code from the first item that has a workOrderNumber
    const firstWorkOrderItem = salesList.find(s => s.workOrderNumber && s.workOrderNumber.trim() !== '');
    if (firstWorkOrderItem) {
      const code = (firstWorkOrderItem.kpclCode || firstWorkOrderItem.item?.kpclCode || '').trim();
      if (code && code !== '-' && code.toLowerCase() !== 'n/a') {
        masterKpclCode = code;
      }
    }
  }

  const itemsRows = salesList.map((s, idx) => {
    const itm = s.purchaseOrderItem || s.item || s.stock || {};
    const q = Number(s.qty || s.quantity || 0);
    const r = Number(s.rate || s.unitPrice || 0);
    const b = round2(q * r);
    const ship = Number(s.shippingCharges || 0);
    
    const cgstPct = s.cgstPercent !== undefined && s.cgstPercent !== null ? Number(s.cgstPercent) : 0;
    const sgstPct = s.sgstPercent !== undefined && s.sgstPercent !== null ? Number(s.sgstPercent) : 0;
    const igstPct = s.igstPercent !== undefined && s.igstPercent !== null ? Number(s.igstPercent) : 0;

    const cg = round2(b * (cgstPct / 100));
    const sg = round2(b * (sgstPct / 100));
    const ig = round2(b * (igstPct / 100));

    totalBasic = round2(totalBasic + b);
    totalCgst = round2(totalCgst + cg);
    totalSgst = round2(totalSgst + sg);
    totalIgst = round2(totalIgst + ig);
    totalShipping = round2(totalShipping + ship);

    const rawItemName = s.receivedItemName || s.itemName || itm.itemName || '';
    let fullSpecs = itm.specifications || s.specifications || (s.description && s.description !== rawItemName ? s.description : '') || '';
    const actualPartNumber = s.receivedPartNumber || itm.partNumber || s.partNumber || '';
    if (!fullSpecs && actualPartNumber && !isWorkOrderInvoice) {
      fullSpecs = `${rawItemName ? `${rawItemName} ` : ''}MAKE- ${itm.make || 'KIRLOSKAR'}, P NO: ${actualPartNumber}`;
    }

    // For WORK_ORDER invoices, use the master KPCL code for ALL items
    const rawKpcl = isWorkOrderInvoice ? masterKpclCode : (itm.kpclCode || s.kpclCode || '').trim();
    const displayKpclCode = (rawKpcl && rawKpcl !== '-' && rawKpcl.toLowerCase() !== 'n/a') ? rawKpcl : '';

    return {
      slNo: idx + 1,
      kpclCode: displayKpclCode,
      itemName: rawItemName,
      specifications: fullSpecs,
      partNumber: actualPartNumber,
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

  // Completely hide KPCL column in Work Order invoices when KPCL codes are empty
  const hasKpclCode = itemsRows.some(r => r.kpclCode && r.kpclCode.trim() !== '' && r.kpclCode !== '-' && r.kpclCode.toLowerCase() !== 'n/a');
  const showKpclColumn = isWorkOrderInvoice ? hasKpclCode : true;

  const totalInvoiceAmount = round2(totalBasic + totalCgst + totalSgst + totalIgst + totalShipping);

  // Number to Indian Rupees words converter matching physical scan
  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                  'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertBelowThousand = (n: number): string => {
      let res = '';
      if (n >= 100) {
        res += ones[Math.floor(n / 100)] + ' Hundred';
        n %= 100;
        if (n > 0) res += ' & ';
      }
      if (n > 0) {
        if (n < 20) {
          res += ones[n];
        } else {
          res += tens[Math.floor(n / 10)];
          if (n % 10 > 0) res += ' ' + ones[n % 10];
        }
      }
      return res;
    };

    const whole = Math.floor(num);
    if (whole === 0) return 'Zero Rupees.';

    let crore = Math.floor(whole / 10000000);
    let rem = whole % 10000000;
    let lakh = Math.floor(rem / 100000);
    rem %= 100000;
    let thousand = Math.floor(rem / 1000);
    rem %= 1000;

    const parts: string[] = [];
    if (crore > 0) parts.push(convertBelowThousand(crore) + ' Crores');
    if (lakh > 0) parts.push(convertBelowThousand(lakh) + ' Lakhs');
    if (thousand > 0) parts.push(convertBelowThousand(thousand) + ' Thousand');
    if (rem > 0) parts.push(convertBelowThousand(rem));

    return parts.join(' ').trim() + ' Rupees.';
  };

  const amountInWordsText = numberToWords(totalInvoiceAmount);
  let wordsLine1 = amountInWordsText;
  let wordsLine2 = '';
  if (amountInWordsText.includes('Thousand')) {
    const idx = amountInWordsText.indexOf('Thousand') + 'Thousand'.length;
    wordsLine1 = amountInWordsText.slice(0, idx).trim();
    wordsLine2 = amountInWordsText.slice(idx).trim();
  }

  // Exact pagination logic matching section 5 rule 6 and invoice_engine.py
  const paginateInvoiceItems = (items: typeof itemsRows): (typeof itemsRows)[] => {
    if (items.length === 25) {
      return [items.slice(0, 6), items.slice(6, 17), items.slice(17, 25)];
    }
    if (items.length <= 5) {
      return [items];
    }
    const pages: (typeof itemsRows)[] = [];
    let currentPage: typeof itemsRows = [];
    let currentHeight = 0;
    let isFirstPage = true;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const specLines = (item.specifications || '').split('\n').length;
      const itemHeight = Math.max(55, 30 + specLines * 13);
      const limit = isFirstPage ? 520 : 800;
      
      if (currentHeight + itemHeight > limit && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [item];
        currentHeight = itemHeight;
        isFirstPage = false;
      } else {
        currentPage.push(item);
        currentHeight += itemHeight;
      }
    }
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }
    return pages;
  };

  const invoicePages = paginateInvoiceItems(itemsRows);
  const totalPagesCount = invoicePages.length;

  const effectiveCgstPercent = primarySale.cgstPercent !== undefined ? Number(primarySale.cgstPercent) : (itemsRows[0]?.cgstPercent || 0);
  const effectiveSgstPercent = primarySale.sgstPercent !== undefined ? Number(primarySale.sgstPercent) : (itemsRows[0]?.sgstPercent || 0);
  const effectiveIgstPercent = primarySale.igstPercent !== undefined ? Number(primarySale.igstPercent) : (itemsRows[0]?.igstPercent || 0);

  const effectiveStateOfSupply = (customSettings.stateOfSupply !== undefined && customSettings.stateOfSupply.trim() !== '') 
    ? customSettings.stateOfSupply.trim().toUpperCase() 
    : (primarySale.stateOfSupply || 'KARNATAKA').toUpperCase();

  const effectiveSupplyTo = (customSettings.supplyTo !== undefined && customSettings.supplyTo.trim() !== '')
    ? customSettings.supplyTo.trim().toUpperCase()
    : (primarySale.placeOfWork || primarySale.supplyTo || partyName || '-').toUpperCase();

  const generatePdf = (): jsPDF => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2); // 190mm

    let y = 8;

    const drawHeaderBox = (targetY = 8) => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.rect(margin, targetY, contentWidth, 24);

      if (SKC_LOGO_BASE64) {
        try {
          doc.addImage(SKC_LOGO_BASE64, 'PNG', margin + 2.5, targetY + 2, 19, 19);
        } catch (e) {
          console.warn('Logo render fallback:', e);
        }
      }

      // Title text: Company Name (Bold Red Serif)
      doc.setTextColor(218, 18, 18);
      doc.setFont('times', 'bold');
      doc.setFontSize(17);
      doc.text((customSettings.companyName !== undefined ? customSettings.companyName : (primarySale.companyName || 'SRI KRISHNA CONSTRUCTIONS')).toUpperCase(), pageWidth / 2, targetY + 6.5, { align: 'center' });

      // Subtitle & Address
      doc.setTextColor(0, 0, 0);
      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.text(customSettings.companyAddress !== undefined ? customSettings.companyAddress : (primarySale.companyAddress || 'H.no 2436 Raghavendra Colony Shaktinagar Raichur Karnataka-584170'), pageWidth / 2, targetY + 11.2, { align: 'center' });
      
      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.text(customSettings.companyTagline !== undefined ? customSettings.companyTagline : 'All type of air compressor Service and Spares Avaliable.', pageWidth / 2, targetY + 15.8, { align: 'center' });

      // GST and Mobile Bar (inside company header box, no dividing line above)
      doc.setFont('times', 'bold');
      doc.setFontSize(8.2);
      doc.text(`GST NO: ${customSettings.companyGst !== undefined ? customSettings.companyGst : (primarySale.companyGstNumber || '29DWKPP3582H1ZV')}`, margin + 2.5, targetY + 22.3);
      doc.text(`Mobile No: ${customSettings.companyPhone !== undefined ? customSettings.companyPhone : (primarySale.companyPhone || '8496841904')}`, pageWidth - margin - 2.5, targetY + 22.3, { align: 'right' });
    };

    // 1. TOP HEADER BOX ON PAGE 1
    drawHeaderBox(y);
    y += 24;

    // 2. BOXED TAX INVOICE TITLE (PAGE 1 ONLY)
    doc.rect(margin, y, contentWidth, 6.5);
    doc.setFontSize(13);
    doc.setFont('times', 'bold');
    doc.text(isInward ? 'INWARD MATERIAL RECEIPT' : 'TAX INVOICE', pageWidth / 2, y + 4.8, { align: 'center' });
    y += 6.5;

    // 3. TWO-COLUMN INVOICE & DISPATCH DETAILS GRID (EXACT 4-ROW PHYSICAL LAYOUT)
    const boxHeight = 52;
    const colHalf = contentWidth / 2; // 95mm

    doc.rect(margin, y, contentWidth, boxHeight);
    doc.line(margin + colHalf, y, margin + colHalf, y + boxHeight); // vertical center divider

    // Exact continuous horizontal row dividers across both columns
    doc.line(margin, y + 6.5, margin + contentWidth, y + 6.5); // Row 1 divider (Inv No & PO No)
    doc.line(margin, y + 13, margin + contentWidth, y + 13);   // Row 2 divider (Inv Date & PO Date)
    doc.line(margin, y + 42, margin + contentWidth, y + 42);   // Row 3 divider (Supply To & Shipped To)

    // Row 1: Left: Invoice/Receipt No, Right: PO No / WO No / Ref No
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.text(`${isInward ? 'RECEIPT NO' : 'INVOICE NO'}: ${invoiceNo}`, margin + 2, y + 4.6);
    doc.text(`${refLabel}: ${refNumber}`, margin + colHalf + 2, y + 4.6);

    // Row 2: Left: Invoice/Receipt Date, Right: Order/WO Date
    doc.text(`${isInward ? 'RECEIPT DATE' : 'INVOICE DATE'}: ${invoiceDate}`, margin + 2, y + 11.1);
    doc.text(`${dateLabel}: ${refDate}`, margin + colHalf + 2, y + 11.1);

    // Row 3 Left: Supply To, Paying Authority Address & GSTIN
    doc.text(`SUPPLY To : ${effectiveSupplyTo}`, margin + 2, y + 17);
    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    
    if (partyAddress) {
      const addressLines = doc.splitTextToSize(partyAddress, colHalf - 4);
      doc.text(addressLines.slice(0, 5), margin + 2, y + 21);
    } else if (partyName && partyName !== '-' && partyName !== 'Customer' && partyName !== 'Supplier') {
      doc.text(`Party: ${partyName}`, margin + 2, y + 21);
    }
    
    if (partyGst && partyGst.trim() !== '' && partyGst !== '-') {
      doc.setFont('times', 'bold');
      doc.setFontSize(8);
      doc.text(`GST NO: ${partyGst}`, margin + 2, y + 39.5);
    }

    // Row 3 Right: State of Supply, Shipped To Address & GSTIN
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.text(`State of Supply: ${effectiveStateOfSupply}`, margin + colHalf + 2, y + 17);
    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);

    const shippedToText = primarySale.shippedTo || partyAddress || partyName || '-';
    const shipLines = doc.splitTextToSize(`Shipped To: ${shippedToText}`, colHalf - 4);
    doc.text(shipLines.slice(0, 5), margin + colHalf + 2, y + 21);
    
    if (partyGst && partyGst.trim() !== '' && partyGst !== '-') {
      doc.setFont('times', 'bold');
      doc.setFontSize(8);
      doc.text(`GST NO: ${partyGst}`, margin + colHalf + 2, y + 39.5);
    }

    // Row 4 Left: Division
    if (showDivision && divLabel && divLabel !== '-') {
      doc.setFont('times', 'bold');
      doc.setFontSize(8);
      doc.text(`Division: ${divLabel}`, margin + 2, y + 47.5);
    }

    // Row 4 Right: Vehicle No & E-Way Bill
    const hasVehicle = vehicleNo && vehicleNo.trim() !== '' && vehicleNo !== '-';
    const hasEway = eWayBillNo && eWayBillNo.trim() !== '' && eWayBillNo !== '-';

    if (hasVehicle && hasEway) {
      doc.setFontSize(7.5);
      doc.text(`Vehicle No : ${vehicleNo}`, margin + colHalf + 2, y + 46);
      doc.text(`E-Way Bill : ${eWayBillNo}`, margin + colHalf + 2, y + 50);
    } else if (hasEway) {
      doc.setFontSize(8);
      doc.text(`E-Way Bill : ${eWayBillNo}`, margin + colHalf + 2, y + 47.5);
    } else if (hasVehicle) {
      doc.setFontSize(8);
      doc.text(`Vehicle No : ${vehicleNo}`, margin + colHalf + 2, y + 47.5);
    }

    y += boxHeight;

    // 4. INVOICE ITEMS TABLE (DYNAMIC KPCL HIDING & EXACT 128mm DIVIDER ALIGNMENT)
    const tableHead: any = showKpclColumn
      ? [
          [
            { content: 'SI\nNO', styles: { halign: 'center' } },
            { content: 'KPCL ITEM\nCODE', styles: { halign: 'center' } },
            { content: 'Description', styles: { halign: 'center' } },
            { content: 'ITEM NAME &\nSPECIFICATION', styles: { halign: 'center' } },
            { content: 'UNIT', styles: { halign: 'center' } },
            { content: 'QTY', styles: { halign: 'center' } },
            { content: 'PRICE', styles: { halign: 'right' } },
            { content: 'AMOUNT', styles: { halign: 'right' } }
          ]
        ]
      : [
          [
            { content: 'SI\nNO', styles: { halign: 'center' } },
            { content: 'Description', styles: { halign: 'center' } },
            { content: 'ITEM NAME &\nSPECIFICATION', styles: { halign: 'center' } },
            { content: 'UNIT', styles: { halign: 'center' } },
            { content: 'QTY', styles: { halign: 'center' } },
            { content: 'PRICE', styles: { halign: 'right' } },
            { content: 'AMOUNT', styles: { halign: 'right' } }
          ]
        ];

    const tableBody = itemsRows.map((r) => {
      const specText = `${r.specifications || ''}${r.partNumber && !((r.specifications || '').includes(r.partNumber)) ? `${r.specifications ? '\n' : ''}P NO: ${r.partNumber}` : ''}`.trim();
      const unitText = r.unit === 'NOS' ? "No's" : (r.unit || "No's");
      if (showKpclColumn) {
        return [
          r.slNo.toString(),
          r.kpclCode || '-',
          r.itemName,
          specText,
          unitText,
          r.qty.toString(),
          fmt(r.rate),
          fmt(r.amount)
        ];
      } else {
        return [
          r.slNo.toString(),
          r.itemName,
          specText,
          unitText,
          r.qty.toString(),
          fmt(r.rate),
          fmt(r.amount)
        ];
      }
    });

    const columnStyles: any = showKpclColumn
      ? {
          0: { halign: 'center', cellWidth: 9, fontStyle: 'bold' },
          1: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
          2: { halign: 'left', cellWidth: 38, fontStyle: 'bold' },
          3: { halign: 'left', cellWidth: 59, fontStyle: 'normal' },
          4: { halign: 'center', cellWidth: 11, fontStyle: 'bold' },
          5: { halign: 'center', cellWidth: 11, fontStyle: 'bold' },
          6: { halign: 'right', cellWidth: 18, fontStyle: 'bold' },
          7: { halign: 'right', cellWidth: 22, fontStyle: 'bold' }
        }
      : {
          0: { halign: 'center', cellWidth: 10, fontStyle: 'bold' },
          1: { halign: 'left', cellWidth: 48, fontStyle: 'bold' },
          2: { halign: 'left', cellWidth: 70, fontStyle: 'normal' },
          3: { halign: 'center', cellWidth: 11, fontStyle: 'bold' },
          4: { halign: 'center', cellWidth: 11, fontStyle: 'bold' },
          5: { halign: 'right', cellWidth: 18, fontStyle: 'bold' },
          6: { halign: 'right', cellWidth: 22, fontStyle: 'bold' }
        };

    autoTable(doc, {
      startY: y,
      margin: { top: 32, left: margin, right: margin, bottom: 16 },
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      rowPageBreak: 'avoid', // PREVENTS ANY ROW FROM SPLITTING HALFWAY ACROSS PAGES
      styles: {
        font: 'times',
        fontSize: 8.0,
        lineColor: [0, 0, 0],
        lineWidth: 0.4,
        textColor: [0, 0, 0],
        cellPadding: { top: 1.6, bottom: 1.6, left: 1.5, right: 1.5 },
        valign: 'top'
      },
      headStyles: {
        font: 'times',
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8.2,
        valign: 'middle',
        lineWidth: 0.4,
        lineColor: [0, 0, 0]
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255]
      },
      columnStyles: columnStyles,
      didDrawPage: (data) => {
        // Draw top header banner on all subsequent pages (page 2, 3...)
        if (data.pageNumber > 1) {
          drawHeaderBox(8);
        }
      }
    });

    const finalTableY = (doc as any).lastAutoTable?.finalY || (y + 40);

    // Check if space is sufficient on current page for totals box & signatures (needs ~68mm)
    let fy = finalTableY;
    if (fy + 68 > 278) {
      doc.addPage();
      drawHeaderBox(8);
      fy = 32;
    }

    // 5. BOTTOM TOTALS BOX & BANK DETAILS (MATCHING KPCL 128mm / 40mm / 22mm COLUMNS)
    const leftBoxWidth = 128; // cols 0..3 (9+22+38+59 = 128mm)
    const middleWidth = 40;   // cols 4..6 (11+11+18 = 40mm)
    const rightColWidth = 22; // col 7 (22mm)
    const bottomBoxHeight = 35;

    // Outer Box border & Vertical Dividers
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(margin, fy, contentWidth, bottomBoxHeight);
    doc.line(margin + leftBoxWidth, fy, margin + leftBoxWidth, fy + bottomBoxHeight); // Vertical Line 1 (col 4 border)
    doc.line(margin + leftBoxWidth + middleWidth, fy, margin + leftBoxWidth + middleWidth, fy + bottomBoxHeight); // Vertical Line 2 (col 7 border)

    // Left Box: Total Invoice amount in words + Bank Details
    doc.setFont('times', 'bold');
    doc.setFontSize(8.2);
    doc.text('Total Invoice amount in words: ', margin + 2, fy + 4.2);
    const inWordsClean = amountInWordsText.replace(/^INR\s*/i, '').replace(/Rupees/i, 'Rupees').trim();
    const wordsLines = doc.splitTextToSize(inWordsClean, leftBoxWidth - 4);
    doc.text(wordsLines.slice(0, 2), margin + 2, fy + 8.2);

    doc.line(margin, fy + 12.5, margin + leftBoxWidth, fy + 12.5);

    doc.setFont('times', 'bold');
    doc.text('Bank Details :', margin + 2, fy + 16.5);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text(`Account Holder Name : ${customSettings.bankHolder !== undefined ? customSettings.bankHolder : 'Sri Krishna Constructions'}`, margin + 2, fy + 20.5);
    doc.text(`Bank Name : ${customSettings.bankName !== undefined ? customSettings.bankName : 'Canara Bank Deosugur Branch'}`, margin + 2, fy + 24.5);
    doc.text(`Bank Account No: ${customSettings.bankAccount !== undefined ? customSettings.bankAccount : '18133070005349'}`, margin + 2, fy + 28.5);
    doc.text(`IFSC Code:${customSettings.bankIfsc !== undefined ? customSettings.bankIfsc : 'CNRB0011813'}`, margin + 2, fy + 32.5);

    // Right Box: Basic Cost, Taxes (SGST, CGST, IGST), Shipping, TOTAL TAX AMOUNT, TOTAL AMOUNT
    const labelX = margin + leftBoxWidth + 2;
    const numberX = margin + contentWidth - 2;

    const summaryRows: Array<{ label: string; value: string; isBold?: boolean }> = [];
    summaryRows.push({ label: 'Basic Cost', value: fmt(totalBasic) });

    if (totalSgst > 0 || totalCgst > 0) {
      summaryRows.push({ label: `SGST ${effectiveSgstPercent > 0 ? effectiveSgstPercent + '%' : ''}`.trim(), value: fmt(totalSgst) });
      summaryRows.push({ label: `CGST ${effectiveCgstPercent > 0 ? effectiveCgstPercent + '%' : ''}`.trim(), value: fmt(totalCgst) });
    }
    if (totalIgst > 0) {
      summaryRows.push({ label: `IGST ${effectiveIgstPercent > 0 ? effectiveIgstPercent + '%' : ''}`.trim(), value: fmt(totalIgst) });
    }
    if (totalCgst === 0 && totalSgst === 0 && totalIgst === 0) {
      summaryRows.push({ label: 'GST (0%)', value: fmt(0) });
    }
    if (totalShipping > 0) {
      summaryRows.push({ label: 'Shipping Charges', value: fmt(totalShipping) });
    }
    const totalTax = round2(totalCgst + totalSgst + totalIgst);
    summaryRows.push({ label: 'TOTAL TAX AMOUNT', value: fmt(totalTax), isBold: true });
    summaryRows.push({ label: 'TOTAL AMOUNT', value: fmt(totalInvoiceAmount), isBold: true });

    const rowHeight = bottomBoxHeight / summaryRows.length;
    summaryRows.forEach((row, rIdx) => {
      const rowY = fy + (rIdx * rowHeight);
      doc.setFont('times', row.isBold ? 'bold' : 'normal');
      doc.setFontSize(row.isBold ? 8.5 : 8.0);
      doc.text(row.label, labelX, rowY + (rowHeight * 0.70));
      doc.text(row.value, numberX, rowY + (rowHeight * 0.70), { align: 'right' });
      if (rIdx < summaryRows.length - 1) {
        doc.line(margin + leftBoxWidth, rowY + rowHeight, margin + contentWidth, rowY + rowHeight);
      }
    });

    // 6. Signatures (Royal Blue Company Title & Underlined Signatory)
    let sigY = fy + bottomBoxHeight + 5;
    if (sigY + 22 > 280) {
      doc.addPage();
      drawHeaderBox(8);
      sigY = 36;
    }
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Your Faithfully', pageWidth - margin - 22, sigY, { align: 'center' });
    
    // Royal Blue for company signature & Proprietor designation
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(43, 87, 151); // #2b5797
    doc.text(customSettings.signatoryTitle || 'For Sri Krishna Constructions', pageWidth - margin - 22, sigY + 5.5, { align: 'center' });

    // Proprietor designation in matching serif (with blank space for physical signature)
    doc.setTextColor(43, 87, 151); // #2b5797
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);
    doc.text(customSettings.signatoryDesignation || 'Proprietor', pageWidth - margin - 22, sigY + 22, { align: 'center' });

    // 7. Render exact, synchronized page count on every page (e.g., Page 1 of 3, Page 2 of 3, Page 3 of 3)
    const totalPages = typeof (doc as any).getNumberOfPages === 'function' 
      ? (doc as any).getNumberOfPages() 
      : ((doc.internal as any).pages ? (doc.internal as any).pages.length - 1 : 1);

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('times', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 292, { align: 'center' });
    }

    return doc;
  };

  const downloadPdf = async () => {
    try {
      showToast('Generating pixel-perfect Tax Invoice PDF...', 'info');
      const backendItems = itemsRows.map(r => ({
        sl_no: r.slNo,
        kpcl_code: r.kpclCode,
        description: r.itemName,
        specification: r.specifications,
        unit: r.unit,
        qty: r.qty,
        price: r.rate,
        amount: r.amount
      }));

      const payload = {
        invoiceData: {
          invoice_no: invoiceNo,
          invoice_date: invoiceDate,
          po_no: refNumber,
          order_date: refDate,
          supply_to: effectiveSupplyTo,
          state_of_supply: effectiveStateOfSupply,
          bill_to_block: partyAddress ? `TO Paying Authority:${partyName}\n${partyAddress}${partyGst && partyGst !== '-' ? `\nGST NO:${partyGst}` : ''}` : (partyName ? `TO Paying Authority:${partyName}${partyGst && partyGst !== '-' ? `\nGST NO:${partyGst}` : ''}` : ''),
          ship_to_block: shippedToText ? `Shipped To: ${shippedToText}${partyGst && partyGst !== '-' ? `\nGST NO:${partyGst}` : ''}` : '',
          division: showDivision ? divLabel : '',
          vehicle_no: vehicleNo,
          eway_bill: eWayBillNo,
          company_gstin: customSettings.companyGst,
          company_mobile: customSettings.companyPhone,
          bank_holder: customSettings.bankHolder,
          bank_name: customSettings.bankName,
          bank_account_no: customSettings.bankAccount,
          bank_ifsc: customSettings.bankIfsc,
          is_work_order: isWorkOrderInvoice,
          show_kpcl_column: showKpclColumn,
          items: backendItems
        },
        settings: {
          gst_rounding: customSettings.gstRounding || 'up',
          show_eway_bill: customSettings.showEwayBill || false,
          repeat_column_headers: customSettings.repeatColumnHeaders || false,
          number_style: customSettings.numberStyle || 'plain'
        }
      };

      const token = localStorage.getItem('iac_token') || localStorage.getItem('token');
      const apiBase = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.includes('onrender.com'))
        ? 'https://sri-krishna-constructions.onrender.com/api'
        : (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com') ? '/api' : 'http://localhost:5000/api');

      const response = await fetch(`${apiBase}/sales/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${isInward ? 'INWARD_RECEIPT' : 'TAX_INVOICE'}_${invoiceNo.replaceAll('/', '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast('Tax Invoice PDF downloaded successfully (Original Fidelity)', 'success');
        return;
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn('Backend PDF generator returned non-ok:', response.status, errJson);
      }
    } catch (e) {
      console.warn('Backend PDF generator fallback:', e);
    }

    try {
      const doc = generatePdf();
      doc.save(`${isInward ? 'INWARD_RECEIPT' : 'TAX_INVOICE'}_${invoiceNo.replaceAll('/', '_')}.pdf`);
      showToast('Tax Invoice PDF downloaded successfully (client fallback)', 'success');
    } catch (error) {
      console.error('Failed to generate Tax Invoice PDF:', error);
      showToast('Error generating PDF. Please check console for details.', 'error');
    }
  };

  const printPdf = async () => {
    try {
      showToast('Preparing Tax Invoice for printing...', 'info');
      const backendItems = itemsRows.map(r => ({
        sl_no: r.slNo,
        kpcl_code: r.kpclCode,
        description: r.itemName,
        specification: r.specifications,
        unit: r.unit,
        qty: r.qty,
        price: r.rate,
        amount: r.amount
      }));

      const payload = {
        invoiceData: {
          invoice_no: invoiceNo,
          invoice_date: invoiceDate,
          po_no: refNumber,
          order_date: refDate,
          supply_to: effectiveSupplyTo,
          state_of_supply: effectiveStateOfSupply,
          bill_to_block: partyAddress ? `TO Paying Authority:${partyName}\n${partyAddress}${partyGst && partyGst !== '-' ? `\nGST NO:${partyGst}` : ''}` : (partyName ? `TO Paying Authority:${partyName}${partyGst && partyGst !== '-' ? `\nGST NO:${partyGst}` : ''}` : ''),
          ship_to_block: shippedToText ? `Shipped To: ${shippedToText}${partyGst && partyGst !== '-' ? `\nGST NO:${partyGst}` : ''}` : '',
          division: showDivision ? divLabel : '',
          vehicle_no: vehicleNo,
          eway_bill: eWayBillNo,
          company_gstin: customSettings.companyGst,
          company_mobile: customSettings.companyPhone,
          bank_holder: customSettings.bankHolder,
          bank_name: customSettings.bankName,
          bank_account_no: customSettings.bankAccount,
          bank_ifsc: customSettings.bankIfsc,
          is_work_order: isWorkOrderInvoice,
          show_kpcl_column: showKpclColumn,
          items: backendItems
        },
        settings: {
          gst_rounding: customSettings.gstRounding || 'up',
          show_eway_bill: customSettings.showEwayBill || false,
          repeat_column_headers: customSettings.repeatColumnHeaders || false,
          number_style: customSettings.numberStyle || 'plain'
        }
      };

      const token = localStorage.getItem('iac_token') || localStorage.getItem('token');
      const apiBase = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.includes('onrender.com'))
        ? 'https://sri-krishna-constructions.onrender.com/api'
        : (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com') ? '/api' : 'http://localhost:5000/api');

      const response = await fetch(`${apiBase}/sales/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const pdfBlob = await response.blob();
        const blobUrl = URL.createObjectURL(pdfBlob);
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            try { document.body.removeChild(iframe); } catch (_) {}
            URL.revokeObjectURL(blobUrl);
          }, 60000);
        };
        return;
      }
    } catch (e) {
      console.warn('Backend PDF print fallback:', e);
    }

    try {
      const doc = generatePdf();
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch (_) {}
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      };
    } catch (error) {
      console.error('Print PDF failed, falling back to window.print():', error);
      window.print();
    }
  };

  const headerCellStyle: React.CSSProperties = {
    fontFamily: "'Times New Roman', serif",
    fontSize: '11.5pt',
    fontWeight: 'bold',
    textAlign: 'center',
    borderRight: '1.4px solid #000000',
    borderBottom: '2.0px solid #000000',
    padding: '3px 1px',
    background: '#ffffff',
    verticalAlign: 'middle',
    lineHeight: 1.1
  };

  const bodyCellStyle: React.CSSProperties = {
    borderRight: '1.4px solid #000000',
    borderBottom: '1.4px solid #000000',
    padding: '3px 4px',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    verticalAlign: 'top',
    fontFamily: "'Times New Roman', serif"
  };

  const totalsRowStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    borderBottom: '1.4px solid #000000',
    height: '27px',
    alignItems: 'center'
  };

  const totalsLabelStyle: React.CSSProperties = {
    width: '64.5%',
    padding: '0 6px',
    fontWeight: 'bold',
    fontSize: '10.5pt',
    borderRight: '1.4px solid #000000',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap'
  };

  const totalsValStyle: React.CSSProperties = {
    width: '35.5%',
    padding: '0 8px',
    textAlign: 'right',
    fontFamily: "'Times New Roman', serif",
    fontSize: '11.5pt',
    fontWeight: 'normal',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end'
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[999999] flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-fadeIn invoice-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        @media print {
          body {
            overflow: visible !important;
          }
          .invoice-modal-overlay {
            position: static !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            z-index: auto !important;
          }
          .invoice-modal-container {
            position: static !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 0 !important;
          }
          .invoice-sheet-container {
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            gap: 0 !important;
          }
          .invoice-page-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 4.5mm 7mm 4.5mm 7mm !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          .invoice-page-sheet:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      {/* CLEAN ENTERPRISE MODAL CONTAINER */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-300 flex flex-col h-[90vh] max-h-[90vh] overflow-hidden animate-fadeIn relative z-[1000000] invoice-modal-container">
        
        {/* MODAL TOP HEADER BAR */}
        <div className="bg-[#1e3a8a] text-white px-4 py-3 sm:px-6 sm:py-3.5 flex flex-wrap justify-between items-center gap-2 shrink-0 border-b border-blue-950 no-print">
          <div className="flex items-center gap-2.5 min-w-0">
            <Printer className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base truncate">
                {isInward ? 'Inward Material Receipt / Invoice' : 'Tax Invoice'} • {invoiceNo}
              </h3>
              <p className="text-[10px] sm:text-xs text-blue-200 truncate">
                {itemsRows.length} item{itemsRows.length > 1 ? 's' : ''} • Date: {invoiceDate} • {totalPagesCount} Page{totalPagesCount > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setTempSettings(customSettings);
                setShowSettingsModal(true);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer"
              title="Edit Top Header, Phone & Bank Details"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Header / Bank
            </button>
            <button
              onClick={printPdf}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer"
              title="Print All Pages Directly"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
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

        {/* AUTHENTIC TAX INVOICE SHEETS (MULTI-PAGE PREVIEW MATCHING PRINT & DOWNLOAD) */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-3 sm:p-6 bg-slate-300/80 flex flex-col items-center gap-6 invoice-sheet-container">
          {invoicePages.map((pageItems, pageIdx) => {
            const pageNum = pageIdx + 1;
            const isPage1 = pageNum === 1;
            const isLastPage = pageNum === totalPagesCount;

            return (
              <div 
                key={pageNum}
                className="bg-white shadow-2xl border border-slate-400 text-black text-xs font-serif invoice-page-sheet relative"
                style={{ 
                  fontFamily: "'Times New Roman', Times, serif",
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '4.5mm 7mm 4.5mm 7mm',
                  boxSizing: 'border-box',
                  background: '#ffffff'
                }}
              >
                {/* 1. OUTER BLACK FRAME */}
                <div style={{ border: '2.4px solid #000000', width: '100%', display: 'flex', flexDirection: 'column' }}>
                  
                  {/* TOP COMPANY HEADER BLOCK ON EVERY PAGE */}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', borderBottom: '2.2px solid #000000' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px 1px 6px' }}>
                      <div style={{ width: '82px', height: '82px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img 
                          src={SKC_LOGO_BASE64 || '/skc_logo.png'} 
                          alt="SKC Logo" 
                          style={{ maxWidth: '80px', maxHeight: '80px', objectFit: 'contain' }}
                        />
                      </div>
                      <div style={{ flexGrow: 1, textAlign: 'center', paddingRight: '40px' }}>
                        <h1 style={{ fontSize: '26pt', fontWeight: 'bold', color: '#C0392B', letterSpacing: '0.8px', margin: 0, lineHeight: 1.05 }}>
                          {(customSettings.companyName !== undefined ? customSettings.companyName : (primarySale.companyName || 'SRI KRISHNA CONSTRUCTIONS')).toUpperCase()}
                        </h1>
                        <div style={{ fontSize: '10.5pt', fontWeight: 'normal', color: '#000000', marginTop: '2px', lineHeight: 1.15 }}>
                          {customSettings.companyAddress !== undefined ? customSettings.companyAddress : (primarySale.companyAddress || 'H.no 2436 Raghavendra Colony Shaktinagar Raichur Karnataka-584170')}
                        </div>
                        <div style={{ fontSize: '11pt', fontWeight: 'normal', color: '#000000', marginTop: '2px', lineHeight: 1.15 }}>
                          {customSettings.companyTagline !== undefined ? customSettings.companyTagline : 'All type of air compressor Service and Spares Avaliable.'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2.5px 8px', fontSize: '10.5pt', fontWeight: 'normal' }}>
                      <div>GST NO: {customSettings.companyGst !== undefined ? customSettings.companyGst : (primarySale.companyGstNumber || '29DWKPP3582H1ZV')}</div>
                      <div>Mobile No: {customSettings.companyPhone !== undefined ? customSettings.companyPhone : (primarySale.companyPhone || '8496841904')}</div>
                    </div>
                  </div>

                  {/* PAGE 1 ONLY: TAX INVOICE BANNER & TWO-COLUMN DETAILS GRID */}
                  {isPage1 && (
                    <>
                      <div style={{ textAlign: 'center', fontSize: '32pt', fontWeight: 'bold', letterSpacing: '1.5px', padding: '2px 0 3px 0', borderBottom: '2.2px solid #000000', lineHeight: 1.0 }}>
                        {isInward ? 'INWARD MATERIAL RECEIPT' : 'TAX INVOICE'}
                      </div>

                      {/* TWO-COLUMN DETAILS GRID (50% / 50% SPLIT) */}
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', borderBottom: '2.2px solid #000000', fontSize: '11pt', fontWeight: 'bold' }}>
                        <div style={{ display: 'flex', width: '100%', borderBottom: '1.2px solid #000000' }}>
                          <div style={{ width: '50%', borderRight: '2.0px solid #000000', padding: '2.5px 6px' }}>
                            {isInward ? 'RECEIPT NO' : 'INVOICE NO'}: {invoiceNo}
                          </div>
                          <div style={{ width: '50%', padding: '2.5px 6px' }}>
                            {refLabel}: {refNumber}
                          </div>
                        </div>
                        <div style={{ display: 'flex', width: '100%', borderBottom: '1.2px solid #000000' }}>
                          <div style={{ width: '50%', borderRight: '2.0px solid #000000', padding: '2.5px 6px' }}>
                            {isInward ? 'RECEIPT DATE' : 'INVOICE DATE'}: {invoiceDate}
                          </div>
                          <div style={{ width: '50%', padding: '2.5px 6px' }}>
                            {dateLabel}: {refDate}
                          </div>
                        </div>
                        <div style={{ display: 'flex', width: '100%', borderBottom: '1.2px solid #000000' }}>
                          <div style={{ width: '50%', borderRight: '2.0px solid #000000', padding: '2.5px 6px', whiteSpace: 'pre-line', lineHeight: 1.2 }}>
                            <div>SUPPLY To : {effectiveSupplyTo}</div>
                            <div style={{ fontSize: '10.5pt', fontWeight: 'normal' }}>
                              {partyAddress ? partyAddress : (partyName || '-')}
                            </div>
                            {partyGst && partyGst.trim() !== '' && partyGst !== '-' && (
                              <div style={{ fontWeight: 'bold', marginTop: '2px' }}>GST NO:{partyGst}</div>
                            )}
                          </div>
                          <div style={{ width: '50%', padding: '2.5px 6px', whiteSpace: 'pre-line', lineHeight: 1.2 }}>
                            <div>State of Supply: {effectiveStateOfSupply}</div>
                            <div style={{ fontSize: '10.5pt', fontWeight: 'normal' }}>
                              Shipped To: {primarySale.shippedTo || partyAddress || partyName || '-'}
                            </div>
                            {partyGst && partyGst.trim() !== '' && partyGst !== '-' && (
                              <div style={{ fontWeight: 'bold', marginTop: '2px' }}>GST NO:{partyGst}</div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', width: '100%' }}>
                          <div style={{ width: '50%', borderRight: '2.0px solid #000000', padding: '2.5px 6px' }}>
                            {showDivision && divLabel && divLabel.trim() !== '' && divLabel !== '-' ? `Division: ${divLabel}` : <>&nbsp;</>}
                          </div>
                          <div style={{ width: '50%', padding: '2.5px 6px' }}>
                            {vehicleNo && vehicleNo.trim() !== '' && vehicleNo !== '-' ? (
                              <div>Vehicle No : <span style={{ textTransform: 'uppercase' }}>{vehicleNo}</span></div>
                            ) : (
                              <>&nbsp;</>
                            )}
                            {eWayBillNo && eWayBillNo !== '-' && customSettings.showEwayBill && (
                              <div style={{ marginTop: '2px' }}>E-Way Bill: {eWayBillNo}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ITEMS TABLE */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    {(isPage1 || customSettings.repeatColumnHeaders) && (
                      <thead>
                        <tr>
                          <th style={{ ...headerCellStyle, width: showKpclColumn ? '4.8%' : '5.3%' }}>SI<br/>NO</th>
                          {showKpclColumn && (
                            <th style={{ ...headerCellStyle, width: '11.5%' }}>KPCL<br/>ITEM<br/>CODE</th>
                          )}
                          <th style={{ ...headerCellStyle, width: showKpclColumn ? '20.0%' : '25.3%', textAlign: 'left', paddingLeft: '4px' }}>Description</th>
                          <th style={{ ...headerCellStyle, width: showKpclColumn ? '31.1%' : '36.8%', textAlign: 'left', paddingLeft: '4px' }}>ITEM NAME &amp;<br/>SPECIFICATION</th>
                          <th style={{ ...headerCellStyle, width: '5.8%' }}>UNIT</th>
                          <th style={{ ...headerCellStyle, width: '5.8%' }}>QTY</th>
                          <th style={{ ...headerCellStyle, width: '9.5%', textAlign: 'right', paddingRight: '6px' }}>PRICE</th>
                          <th style={{ ...headerCellStyle, width: '11.5%', textAlign: 'right', paddingRight: '6px', borderRight: 'none' }}>AMOUNT</th>
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {pageItems.map((r) => (
                        <tr key={r.slNo}>
                          <td style={{ ...bodyCellStyle, width: showKpclColumn ? '4.8%' : '5.3%', textAlign: 'center', fontWeight: 'bold', fontSize: '11.5pt' }}>{r.slNo}</td>
                          {showKpclColumn && (
                            <td style={{ ...bodyCellStyle, width: '11.5%', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '11pt' }}>{r.kpclCode || '-'}</td>
                          )}
                          <td style={{ ...bodyCellStyle, width: showKpclColumn ? '20.0%' : '25.3%', fontWeight: 'bold', fontSize: '10.5pt' }}>{r.itemName}</td>
                          <td style={{ ...bodyCellStyle, width: showKpclColumn ? '31.1%' : '36.8%', fontSize: '10pt', whiteSpace: 'pre-wrap', lineHeight: 1.2 }}>
                            {r.specifications?.trim()}
                            {r.partNumber && !r.specifications?.includes(r.partNumber) && (
                              <div style={{ fontWeight: 'bold', marginTop: '2px' }}>P NO: {r.partNumber}</div>
                            )}
                          </td>
                          <td style={{ ...bodyCellStyle, width: '5.8%', textAlign: 'center', fontWeight: 'bold', fontSize: '11pt' }}>{r.unit === 'NOS' ? "No's" : (r.unit || "No's")}</td>
                          <td style={{ ...bodyCellStyle, width: '5.8%', textAlign: 'center', fontWeight: 'bold', fontSize: '11.5pt' }}>{customSettings.numberStyle === 'formatted' ? r.qty : String(r.qty)}</td>
                          <td style={{ ...bodyCellStyle, width: '9.5%', textAlign: 'right', paddingRight: '6px', fontWeight: 'bold', fontSize: '11.5pt' }}>{customSettings.numberStyle === 'formatted' ? fmt(r.rate) : String(r.rate)}</td>
                          <td style={{ ...bodyCellStyle, width: '11.5%', textAlign: 'right', paddingRight: '6px', fontWeight: 'bold', fontSize: '11.5pt', borderRight: 'none' }}>{customSettings.numberStyle === 'formatted' ? fmt(r.amount) : String(r.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* LAST PAGE ONLY: TOTALS CONTAINER */}
                  {isLastPage && (
                    <div style={{ width: '100%', display: 'flex', borderTop: 'none', fontSize: '11pt' }}>
                      {/* Left: Amount in words + Bank Details (67.4%) */}
                      <div style={{ width: '67.4%', borderRight: '1.4px solid #000000', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '5px 8px', borderBottom: '1.4px solid #000000', fontSize: '11.5pt', fontWeight: 'bold', minHeight: '44px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ lineHeight: 1.2 }}>Total Invoice amount in words: {wordsLine1}</div>
                          {wordsLine2 && <div style={{ textAlign: 'center', marginTop: '3px', lineHeight: 1.2 }}>{wordsLine2}</div>}
                        </div>
                        <div style={{ padding: '5px 8px', fontSize: '11pt', fontWeight: 'bold', lineHeight: 1.35 }}>
                          <div>Bank Details :</div>
                          <div>Account Holder Name : {customSettings.bankHolder !== undefined ? customSettings.bankHolder : 'Sri Krishna Constructions'}</div>
                          <div>Bank Name : {customSettings.bankName !== undefined ? customSettings.bankName : 'Canara Bank Deosugur Branch'}</div>
                          <div>Bank Account No: {customSettings.bankAccount !== undefined ? customSettings.bankAccount : '18133070005349'}</div>
                          <div>IFSC Code:{customSettings.bankIfsc !== undefined ? customSettings.bankIfsc : 'CNRB0011813'}</div>
                        </div>
                      </div>

                      {/* Right: Summary totals (32.6%) */}
                      <div style={{ width: '32.6%', display: 'flex', flexDirection: 'column' }}>
                        <div style={totalsRowStyle}>
                          <div style={totalsLabelStyle}>Basic Cost</div>
                          <div style={totalsValStyle}>{customSettings.numberStyle === 'formatted' ? fmt(totalBasic) : String(totalBasic)}</div>
                        </div>
                        <div style={totalsRowStyle}>
                          <div style={totalsLabelStyle}>SGST 9%</div>
                          <div style={totalsValStyle}>{customSettings.numberStyle === 'formatted' ? fmt(totalSgst) : String(totalSgst)}</div>
                        </div>
                        <div style={totalsRowStyle}>
                          <div style={totalsLabelStyle}>CGST 9%</div>
                          <div style={totalsValStyle}>{customSettings.numberStyle === 'formatted' ? fmt(totalCgst) : String(totalCgst)}</div>
                        </div>
                        <div style={totalsRowStyle}>
                          <div style={{ ...totalsLabelStyle, fontSize: '10pt' }}>TOTAL TAX AMOUNT</div>
                          <div style={totalsValStyle}>{customSettings.numberStyle === 'formatted' ? fmt(totalCgst + totalSgst + totalIgst) : String(totalCgst + totalSgst + totalIgst)}</div>
                        </div>
                        <div style={{ ...totalsRowStyle, borderBottom: 'none' }}>
                          <div style={{ ...totalsLabelStyle, fontSize: '10pt' }}>TOTAL AMOUNT</div>
                          <div style={totalsValStyle}>{customSettings.numberStyle === 'formatted' ? fmt(totalInvoiceAmount) : String(totalInvoiceAmount)}</div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>{/* outer frame */}

                {/* SIGNATURE BLOCK (BELOW OUTER FRAME ON LAST PAGE) */}
                {isLastPage && (
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', paddingTop: '6px', paddingRight: '20px' }}>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <div style={{ fontSize: '11pt', fontFamily: "'Times New Roman', serif", marginBottom: '3px' }}>Your Faithfully</div>
                      <div style={{ fontSize: '14pt', fontFamily: "'Times New Roman', serif", color: '#2b5797', marginBottom: '1px' }}>
                        {customSettings.signatoryTitle || 'For Sri Krishna Constructions'}
                      </div>
                      <div style={{ height: '48px' }} />
                      <div style={{ fontSize: '14pt', fontFamily: "'Times New Roman', serif", color: '#2b5797', marginTop: '1px' }}>
                        {customSettings.signatoryDesignation || 'Proprietor'}
                      </div>
                    </div>
                  </div>
                )}

                {/* PAGE FOOTER */}
                <div style={{ position: 'absolute', bottom: '3.0mm', left: 0, right: 0, textAlign: 'center', fontSize: '9.5pt', fontFamily: "'Times New Roman', serif" }}>
                  Page {pageNum} of {totalPagesCount}
                </div>

              </div>
            );
          })}
        </div>

        {/* BOTTOM MODAL FOOTER BAR */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2 shrink-0 no-print">
          <span className="text-xs text-slate-600 font-medium hidden sm:inline">
            Invoice No: <strong className="font-mono text-slate-900">{invoiceNo}</strong> • Total Amount: <strong className="font-mono text-emerald-800">₹{fmt(totalInvoiceAmount)}</strong>
          </span>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                setTempSettings(customSettings);
                setShowSettingsModal(true);
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4" /> Edit Header / Bank
            </button>
            <button
              onClick={printPdf}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer"
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

      {/* POPUP MODAL: CUSTOMIZE HEADER & BANK DETAILS */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10000000] flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-[#1e3a8a] text-white px-5 py-3.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base">Customize Invoice Header & Bank Details</h3>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <span>🏢 Company Header Details (Top Box)</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={tempSettings.companyName}
                      onChange={e => setTempSettings({ ...tempSettings, companyName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded font-bold uppercase text-red-600 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Company Address</label>
                    <input
                      type="text"
                      value={tempSettings.companyAddress}
                      onChange={e => setTempSettings({ ...tempSettings, companyAddress: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Tagline / Subtitle</label>
                    <input
                      type="text"
                      value={tempSettings.companyTagline}
                      onChange={e => setTempSettings({ ...tempSettings, companyTagline: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Company GST Number</label>
                    <input
                      type="text"
                      value={tempSettings.companyGst}
                      onChange={e => setTempSettings({ ...tempSettings, companyGst: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded font-mono uppercase font-bold focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mobile / Phone Number</label>
                    <input
                      type="text"
                      value={tempSettings.companyPhone}
                      onChange={e => setTempSettings({ ...tempSettings, companyPhone: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded font-mono font-bold focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <span>📍 Supply & Delivery Details (Work Order / Invoice)</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">State of Supply</label>
                    <input
                      type="text"
                      value={tempSettings.stateOfSupply || ''}
                      onChange={e => setTempSettings({ ...tempSettings, stateOfSupply: e.target.value.toUpperCase() })}
                      placeholder="e.g. KARNATAKA"
                      className="w-full p-2 border border-slate-300 rounded font-bold uppercase focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">SUPPLY To (Location / Site / Party)</label>
                    <input
                      type="text"
                      value={tempSettings.supplyTo || ''}
                      onChange={e => setTempSettings({ ...tempSettings, supplyTo: e.target.value })}
                      placeholder="e.g. BTPS, KPCL, KUDATINI"
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <span>🏦 Bank & Payment Details (Bottom Box)</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={tempSettings.bankHolder}
                      onChange={e => setTempSettings({ ...tempSettings, bankHolder: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded font-bold focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bank Name & Branch</label>
                    <input
                      type="text"
                      value={tempSettings.bankName}
                      onChange={e => setTempSettings({ ...tempSettings, bankName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      value={tempSettings.bankAccount}
                      onChange={e => setTempSettings({ ...tempSettings, bankAccount: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded font-mono font-bold focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={tempSettings.bankIfsc}
                      onChange={e => setTempSettings({ ...tempSettings, bankIfsc: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded font-mono uppercase font-bold focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <span>✍️ Signatory Details (Bottom Right)</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Signatory Title</label>
                    <input
                      type="text"
                      value={tempSettings.signatoryTitle}
                      onChange={e => setTempSettings({ ...tempSettings, signatoryTitle: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded font-bold text-blue-700 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={tempSettings.signatoryDesignation}
                      onChange={e => setTempSettings({ ...tempSettings, signatoryDesignation: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <span>⚙️ Invoice Formatting & Layout Settings (Original Match)</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">GST Rounding Method</label>
                    <select
                      value={tempSettings.gstRounding || 'up'}
                      onChange={e => setTempSettings({ ...tempSettings, gstRounding: e.target.value as 'up' | 'nearest' })}
                      className="w-full p-2 border border-slate-300 rounded font-bold text-slate-800 bg-white"
                    >
                      <option value="up">Round UP to Next Rupee (Original Match: 9% = 272,221)</option>
                      <option value="nearest">Round to Nearest Rupee (Standard Math)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Number Formatting Style</label>
                    <select
                      value={tempSettings.numberStyle || 'plain'}
                      onChange={e => setTempSettings({ ...tempSettings, numberStyle: e.target.value as 'plain' | 'formatted' })}
                      className="w-full p-2 border border-slate-300 rounded font-bold text-slate-800 bg-white"
                    >
                      <option value="plain">Plain Digits (Original Match: 3024670, no commas)</option>
                      <option value="formatted">Indian Formatted (30,24,670)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="showEwayBill"
                      checked={tempSettings.showEwayBill || false}
                      onChange={e => setTempSettings({ ...tempSettings, showEwayBill: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                    <label htmlFor="showEwayBill" className="font-bold text-slate-700 cursor-pointer">
                      Show E-Way Bill row under Vehicle No (Default: OFF)
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="repeatHeaders"
                      checked={tempSettings.repeatColumnHeaders || false}
                      onChange={e => setTempSettings({ ...tempSettings, repeatColumnHeaders: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                    <label htmlFor="repeatHeaders" className="font-bold text-slate-700 cursor-pointer">
                      Repeat Table Headers on Continuation Pages (Default: OFF)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetSettings}
                className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs rounded-xl border border-rose-300 flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Default
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-5 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-4 h-4" /> Save & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
