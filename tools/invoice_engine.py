import os
import sys
import json
import math
import base64
import subprocess
from PIL import Image
import pymupdf

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def get_base64_image(file_path):
    if not os.path.exists(file_path):
        return ""
    with open(file_path, "rb") as f:
        ext = os.path.splitext(file_path)[1].lower().replace(".", "")
        if ext == "jpg": ext = "jpeg"
        b64 = base64.b64encode(f.read()).decode("utf-8")
        return f"data:image/{ext};base64,{b64}"

def number_to_indian_words(num):
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
            "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
    
    def convert_below_thousand(n):
        res = ""
        if n >= 100:
            res += ones[n // 100] + " Hundred"
            n %= 100
            if n > 0:
                res += " & "
        if n > 0:
            if n < 20:
                res += ones[n]
            else:
                res += tens[n // 10]
                if n % 10 > 0:
                    res += " " + ones[n % 10]
        return res

    if num == 0:
        return "Zero Rupees."
        
    crore = num // 10000000
    num %= 10000000
    lakh = num // 100000
    num %= 100000
    thousand = num // 1000
    num %= 1000
    remainder = num
    
    parts = []
    if crore > 0:
        parts.append(convert_below_thousand(crore) + " Crores")
    if lakh > 0:
        parts.append(convert_below_thousand(lakh) + " Lakhs")
    if thousand > 0:
        parts.append(convert_below_thousand(thousand) + " Thousand")
    if remainder > 0:
        parts.append(convert_below_thousand(remainder))
        
    text = " ".join(parts).strip()
    return f"{text} Rupees."

def calculate_invoice_totals(items, gst_rounding="up"):
    basic_cost = sum(item["amount"] for item in items)
    raw_tax = basic_cost * 0.09
    if gst_rounding == "up":
        sgst = math.ceil(raw_tax)
        cgst = math.ceil(raw_tax)
    else:
        sgst = round(raw_tax)
        cgst = round(raw_tax)
    total_tax = sgst + cgst
    total_amount = basic_cost + total_tax
    words = number_to_indian_words(total_amount)
    return {
        "basic_cost": basic_cost,
        "sgst": sgst,
        "cgst": cgst,
        "total_tax": total_tax,
        "total_amount": total_amount,
        "amount_in_words": words
    }

def paginate_items(items, target_pages=None):
    """
    Pagination target matching section 5 rule 6:
    Page 1: items 1-6
    Page 2: items 7-17
    Page 3: items 18-25 + totals
    For general arbitrary invoices, uses dynamic height measurement.
    """
    if len(items) == 25 and (target_pages is None or target_pages == 3):
        return [items[0:6], items[6:17], items[17:25]]
    
    if len(items) <= 5:
        return [items]
    
    pages = []
    current_page = []
    current_height = 0
    is_first_page = True
    
    for item in items:
        spec = str(item.get("specification") or "")
        spec_lines = len(spec.split("\n")) if spec else 1
        item_height = max(45, 25 + spec_lines * 13)
        limit = 520 if is_first_page else 800
        
        if current_height + item_height > limit and current_page:
            pages.append(current_page)
            current_page = [item]
            current_height = item_height
            is_first_page = False
        else:
            current_page.append(item)
            current_height += item_height
            
    if current_page:
        pages.append(current_page)
        
    return pages

def generate_invoice_html(invoice_data, settings=None):
    if settings is None:
        settings = {}
    gst_rounding = settings.get("gst_rounding", "up")
    show_eway_bill = settings.get("show_eway_bill", False)
    repeat_column_headers = settings.get("repeat_column_headers", False)
    number_style = settings.get("number_style", "plain")

    items = invoice_data.get("items", [])
    totals = calculate_invoice_totals(items, gst_rounding)
    
    logo_b64 = invoice_data.get("logo_base64", "")
    is_wo = invoice_data.get("is_work_order", False)
    has_kpcl = any(item.get("kpcl_code") and str(item.get("kpcl_code")).strip() not in ["", "-", "N/A", "n/a", "None"] for item in items)
    
    show_kpcl = invoice_data.get("show_kpcl_column")
    if is_wo and not has_kpcl:
        show_kpcl = False
    elif show_kpcl is None:
        show_kpcl = not (is_wo and not has_kpcl)
    elif isinstance(show_kpcl, str):
        show_kpcl = show_kpcl.lower() in ["true", "1", "yes"]

    pages = paginate_items(items)
    total_page_count = len(pages)
    
    def fmt_num(val):
        if number_style == "formatted":
            return f"{val:,.2f}" if isinstance(val, float) else f"{val:,}"
        return str(val)

    # Word wrapping for amount in words into 2 lines matching the original scan
    # Scan: Line 1: "Total Invoice amount in words: Thirty Five Lakhs Sixty Nine Thousand"
    #       Line 2: "One Hundred & Tweleve Rupees." (centered)
    raw_words = totals['amount_in_words']
    if "Thousand" in raw_words:
        parts = raw_words.split("Thousand", 1)
        words_line1 = parts[0] + "Thousand"
        words_line2 = parts[1].strip()
    else:
        words_line1 = raw_words
        words_line2 = ""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Tax Invoice - {invoice_data.get('invoice_no', '')}</title>
<style>
  @page {{
    size: 210mm 297mm;
    margin: 0;
  }}
  * {{
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}
  body {{
    margin: 0;
    padding: 0;
    background: #ffffff;
    font-family: 'Times New Roman', 'Liberation Serif', Times, serif;
    color: #000000;
  }}
  .page {{
    width: 210mm;
    height: 297mm;
    page-break-after: always;
    break-after: page;
    position: relative;
    padding: 4.5mm 7mm 4.5mm 7mm;
    background: #ffffff;
  }}
  .page:last-child {{
    page-break-after: avoid;
    break-after: avoid;
  }}
  /* Outer thick black border around page content */
  .outer-frame {{
    width: 100%;
    border: 2.4px solid #000000;
    display: flex;
    flex-direction: column;
  }}
  
  /* Company Header */
  .header-block {{
    width: 100%;
    display: flex;
    flex-direction: column;
    border-bottom: 2.2px solid #000000;
  }}
  .header-top {{
    display: flex;
    align-items: center;
    padding: 2px 6px 1px 6px;
  }}
  .header-logo {{
    width: 82px;
    height: 82px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  .header-logo img {{
    max-width: 80px;
    max-height: 80px;
    object-fit: contain;
  }}
  .header-info {{
    flex-grow: 1;
    text-align: center;
    padding-right: 40px;
  }}
  .company-title {{
    font-size: 26pt;
    font-weight: bold;
    color: #C0392B;
    letter-spacing: 0.8px;
    margin: 0;
    line-height: 1.05;
  }}
  .company-address {{
    font-size: 10.5pt;
    font-weight: normal;
    color: #000000;
    margin-top: 2px;
    line-height: 1.15;
  }}
  .company-tagline {{
    font-size: 11pt;
    font-weight: normal;
    color: #000000;
    margin-top: 2px;
    line-height: 1.15;
  }}
  .gst-mobile-row {{
    display: flex;
    justify-content: space-between;
    padding: 2.5px 8px;
    font-size: 10.5pt;
    font-weight: normal;
  }}
  
  /* Page 1 Tax Invoice Banner */
  .tax-invoice-banner {{
    text-align: center;
    font-size: 32pt;
    font-weight: bold;
    letter-spacing: 1.5px;
    padding: 2px 0 3px 0;
    border-bottom: 2.2px solid #000000;
    line-height: 1.0;
  }}
  
  /* Meta Grid */
  .meta-grid {{
    width: 100%;
    display: flex;
    flex-direction: column;
    border-bottom: 2.2px solid #000000;
    font-size: 11pt;
    font-weight: bold;
  }}
  .meta-row {{
    display: flex;
    width: 100%;
    border-bottom: 1.2px solid #000000;
  }}
  .meta-row:last-child {{
    border-bottom: none;
  }}
  .meta-left {{
    width: 50%;
    border-right: 2.0px solid #000000;
    padding: 2.5px 6px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }}
  .meta-right {{
    width: 50%;
    padding: 2.5px 6px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }}
  .address-block {{
    white-space: pre-line;
    line-height: 1.2;
    font-size: 10.5pt;
    font-weight: bold;
  }}
  
  /* Item Table */
  .item-table {{
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }}
  .item-table th {{
    font-family: 'Times New Roman', serif;
    font-size: 11.5pt;
    font-weight: bold;
    text-align: center;
    border-right: 1.4px solid #000000;
    border-bottom: 2.0px solid #000000;
    padding: 3px 1px;
    background: #ffffff;
    vertical-align: middle;
    line-height: 1.1;
  }}
  .item-table th:last-child {{
    border-right: none;
  }}
  .item-table td {{
    border-right: 1.4px solid #000000;
    border-bottom: 1.4px solid #000000;
    padding: 3px 4px;
    overflow-wrap: anywhere;
    word-break: break-word;
    page-break-inside: avoid;
    break-inside: avoid;
    vertical-align: top;
  }}
  .item-table td:last-child {{
    border-right: none;
  }}
  
  /* Column Widths */
  .col-sino {{ width: 4.8%; text-align: center; font-family: 'Times New Roman', serif; font-size: 11.5pt; font-weight: bold; vertical-align: top; }}
  .col-code {{ width: 11.5%; text-align: center; font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: normal; vertical-align: top; white-space: nowrap; }}
  .col-disc {{ width: 20.0%; text-align: left; font-family: 'Times New Roman', serif; font-size: 10.5pt; font-weight: bold; vertical-align: top; }}
  .col-spec {{ width: 31.1%; text-align: left; font-family: 'Times New Roman', serif; font-size: 10pt; font-weight: normal; vertical-align: top; white-space: pre-wrap; line-height: 1.2; }}
  .col-sino-nokpcl {{ width: 5.3%; text-align: center; font-family: 'Times New Roman', serif; font-size: 11.5pt; font-weight: bold; vertical-align: top; }}
  .col-disc-nokpcl {{ width: 25.3%; text-align: left; font-family: 'Times New Roman', serif; font-size: 10.5pt; font-weight: bold; vertical-align: top; }}
  .col-spec-nokpcl {{ width: 36.8%; text-align: left; font-family: 'Times New Roman', serif; font-size: 10pt; font-weight: normal; vertical-align: top; white-space: pre-wrap; line-height: 1.2; }}
  .col-unit {{ width: 5.8%; text-align: center; font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: bold; vertical-align: top; }}
  .col-qty {{ width: 5.8%; text-align: center; font-family: 'Times New Roman', serif; font-size: 11.5pt; font-weight: bold; vertical-align: top; }}
  .col-price {{ width: 9.5%; text-align: right; font-family: 'Times New Roman', serif; font-size: 11.5pt; font-weight: bold; vertical-align: top; padding-right: 6px; }}
  .col-amount {{ width: 11.5%; text-align: right; font-family: 'Times New Roman', serif; font-size: 11.5pt; font-weight: bold; vertical-align: top; padding-right: 6px; }}
  
  /* Totals Block - Continuous grid lines with table columns above */
  .totals-container {{
    width: 100%;
    display: flex;
    border-top: none;
    font-size: 11pt;
  }}
  .totals-left {{
    width: 67.4%; /* 128mm / 190mm */
    border-right: 1.4px solid #000000;
    display: flex;
    flex-direction: column;
  }}
  .amount-words-box {{
    padding: 5px 8px;
    border-bottom: 1.4px solid #000000;
    font-size: 11.5pt;
    font-weight: bold;
    min-height: 44px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }}
  .amount-words-line1 {{
    line-height: 1.2;
  }}
  .amount-words-line2 {{
    text-align: center;
    margin-top: 3px;
    line-height: 1.2;
  }}
  .bank-details-box {{
    padding: 5px 8px;
    font-size: 11pt;
    font-weight: bold;
    line-height: 1.35;
  }}
  .totals-right {{
    width: 32.6%; /* 62mm / 190mm */
    display: flex;
    flex-direction: column;
  }}
  .total-row {{
    display: flex;
    width: 100%;
    border-bottom: 1.4px solid #000000;
    height: 27px;
    align-items: center;
  }}
  .total-row:last-child {{
    border-bottom: none;
  }}
  .total-label {{
    width: 64.5%; /* 40mm / 62mm */
    padding: 0 6px;
    font-weight: bold;
    font-size: 10.5pt;
    border-right: 1.4px solid #000000;
    height: 100%;
    display: flex;
    align-items: center;
    white-space: nowrap;
  }}
  .total-label.small-label {{
    font-size: 10pt;
  }}
  .total-value {{
    width: 35.5%; /* 22mm / 62mm */
    padding: 0 8px;
    text-align: right;
    font-family: 'Times New Roman', serif;
    font-size: 11.5pt;
    font-weight: normal;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }}
  
  /* Signature Area (Below Outer Box on Page 3) */
  .sig-container {{
    width: 100%;
    display: flex;
    justify-content: flex-end;
    padding-top: 6px;
    padding-right: 20px;
  }}
  .sig-box {{
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }}
  .faithfully-text {{
    font-size: 11pt;
    font-family: 'Times New Roman', serif;
    margin-bottom: 3px;
  }}
  .company-sig-name {{
    font-size: 14pt;
    font-family: 'Times New Roman', serif;
    color: #2b5797;
    margin-bottom: 1px;
  }}
  .sig-img-container {{
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin: 1px 0;
  }}
  .sig-img-container img {{
    max-height: 46px;
    object-fit: contain;
  }}
  .proprietor-text {{
    font-size: 14pt;
    font-family: 'Times New Roman', serif;
    color: #2b5797;
    margin-top: 1px;
  }}
  
  /* Page Footer */
  .page-footer {{
    position: absolute;
    bottom: 3.0mm;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 9.5pt;
    font-family: 'Times New Roman', serif;
  }}
</style>
</head>
<body>
"""

    for page_idx, page_items in enumerate(pages):
        page_num = page_idx + 1
        is_page_1 = (page_num == 1)
        is_last_page = (page_num == total_page_count)

        html += f"""
<div class="page">
  <div class="outer-frame">
    <!-- Header -->
    <div class="header-block">
      <div class="header-top">
        <div class="header-logo">
          {f'<img src="{logo_b64}" alt="Logo">' if logo_b64 else ''}
        </div>
        <div class="header-info">
          <h1 class="company-title">SRI KRISHNA CONSTRUCTIONS</h1>
          <div class="company-address">H.no 2436 Raghavendra Colony Shaktinagar Raichur Karnataka-584170</div>
          <div class="company-tagline">All type of air compressor Service and Spares Avaliable.</div>
        </div>
      </div>
      <div class="gst-mobile-row">
        <div>GST NO: {invoice_data.get('company_gstin', '29DWKPP3582H1ZV')}</div>
        <div>Mobile No:  {invoice_data.get('company_mobile', '8496841904')}</div>
      </div>
    </div>
"""
        if is_page_1:
            html += f"""
    <!-- Tax Invoice Banner -->
    <div class="tax-invoice-banner">TAX INVOICE</div>
    
    <!-- Meta Grid -->
    <div class="meta-grid">
      <div class="meta-row">
        <div class="meta-left">INVOICE NO: {invoice_data.get('invoice_no', '')}</div>
        <div class="meta-right">PO No: {invoice_data.get('po_no', '')}</div>
      </div>
      <div class="meta-row">
        <div class="meta-left">INVOICE DATE: {invoice_data.get('invoice_date', '')}</div>
        <div class="meta-right">Order Date: {invoice_data.get('order_date', '')}</div>
      </div>
      <div class="meta-row">
        <div class="meta-left">SUPPLY To : {invoice_data.get('supply_to', '')}</div>
        <div class="meta-right">State of Supply: {invoice_data.get('state_of_supply', '')}</div>
      </div>
      <div class="meta-row">
        <div class="meta-left">
          <div class="address-block">{invoice_data.get('bill_to_block', '')}</div>
        </div>
        <div class="meta-right">
          <div class="address-block">{invoice_data.get('ship_to_block', '')}</div>
        </div>
      </div>
      <div class="meta-row">
        <div class="meta-left">{'Division: ' + str(invoice_data.get('division')).strip() if invoice_data.get('division') and str(invoice_data.get('division')).strip() not in ['', '-', 'None'] else '&nbsp;'}</div>
        <div class="meta-right">
          {f'Vehicle No : {str(invoice_data.get("vehicle_no")).strip()}' if invoice_data.get('vehicle_no') and str(invoice_data.get('vehicle_no')).strip() not in ['', '-', 'None'] else '&nbsp;'}
          {f'<div style="margin-top:2px;">E-Way Bill: {invoice_data.get("eway_bill", "")}</div>' if show_eway_bill and invoice_data.get("eway_bill") and str(invoice_data.get("eway_bill")).strip() not in ['', '-', 'None'] else ''}
        </div>
      </div>
    </div>
"""

        # Table Section
        show_headers = is_page_1 or repeat_column_headers
        html += f"""
    <!-- Item Table -->
    <table class="item-table">
"""
        if show_headers:
            if show_kpcl:
                html += f"""
      <thead>
        <tr>
          <th class="col-sino">SI<br>NO</th>
          <th class="col-code">KPCL<br>ITEM<br>CODE</th>
          <th class="col-disc">Description</th>
          <th class="col-spec">ITEM NAME &amp;<br>SPECIFICATION</th>
          <th class="col-unit">UNIT</th>
          <th class="col-qty">QTY</th>
          <th class="col-price">PRICE</th>
          <th class="col-amount">AMOUNT</th>
        </tr>
      </thead>
"""
            else:
                html += f"""
      <thead>
        <tr>
          <th class="col-sino-nokpcl">SI<br>NO</th>
          <th class="col-disc-nokpcl">Description</th>
          <th class="col-spec-nokpcl">ITEM NAME &amp;<br>SPECIFICATION</th>
          <th class="col-unit">UNIT</th>
          <th class="col-qty">QTY</th>
          <th class="col-price">PRICE</th>
          <th class="col-amount">AMOUNT</th>
        </tr>
      </thead>
"""
        html += """      <tbody>
"""
        for item in page_items:
            if show_kpcl:
                html += f"""        <tr>
          <td class="col-sino">{item.get('sl_no', '')}</td>
          <td class="col-code">{item.get('kpcl_code', '')}</td>
          <td class="col-disc">{item.get('description', '')}</td>
          <td class="col-spec">{item.get('specification') or ''}</td>
          <td class="col-unit">{item.get('unit', '')}</td>
          <td class="col-qty">{fmt_num(item.get('qty', 0))}</td>
          <td class="col-price">{fmt_num(item.get('price', 0))}</td>
          <td class="col-amount">{fmt_num(item.get('amount', 0))}</td>
        </tr>
"""
            else:
                html += f"""        <tr>
          <td class="col-sino-nokpcl">{item.get('sl_no', '')}</td>
          <td class="col-disc-nokpcl">{item.get('description', '')}</td>
          <td class="col-spec-nokpcl">{item.get('specification') or ''}</td>
          <td class="col-unit">{item.get('unit', '')}</td>
          <td class="col-qty">{fmt_num(item.get('qty', 0))}</td>
          <td class="col-price">{fmt_num(item.get('price', 0))}</td>
          <td class="col-amount">{fmt_num(item.get('amount', 0))}</td>
        </tr>
"""
        html += """      </tbody>
    </table>
"""

        if is_last_page:
            html += f"""
    <!-- Totals Container -->
    <div class="totals-container">
      <div class="totals-left">
        <div class="amount-words-box">
          <div class="amount-words-line1">Total Invoice amount in words: {words_line1}</div>
          <div class="amount-words-line2">{words_line2}</div>
        </div>
        <div class="bank-details-box">
          <div>Bank Details :</div>
          <div>Account Holder Name : {invoice_data.get('bank_holder', 'Sri Krishna Constructions')}</div>
          <div>Bank Name : {invoice_data.get('bank_name', 'Canara Bank Deosugur Branch')}</div>
          <div>Bank Account No: {invoice_data.get('bank_account_no', '18133070005349')}</div>
          <div>IFSC Code:{invoice_data.get('bank_ifsc', 'CNRB0011813')}</div>
        </div>
      </div>
      <div class="totals-right">
        <div class="total-row">
          <div class="total-label">Basic Cost</div>
          <div class="total-value">{fmt_num(totals['basic_cost'])}</div>
        </div>
        <div class="total-row">
          <div class="total-label">SGST 9%</div>
          <div class="total-value">{fmt_num(totals['sgst'])}</div>
        </div>
        <div class="total-row">
          <div class="total-label">CGST 9%</div>
          <div class="total-value">{fmt_num(totals['cgst'])}</div>
        </div>
        <div class="total-row">
          <div class="total-label small-label">TOTAL TAX AMOUNT</div>
          <div class="total-value">{fmt_num(totals['total_tax'])}</div>
        </div>
        <div class="total-row">
          <div class="total-label small-label">TOTAL AMOUNT</div>
          <div class="total-value">{fmt_num(totals['total_amount'])}</div>
        </div>
      </div>
    </div>
"""

        html += f"""
  </div><!-- .outer-frame -->
"""
        if is_last_page:
            html += f"""
  <!-- Signatures Block outside outer-frame -->
  <div class="sig-container">
    <div class="sig-box">
      <div class="faithfully-text">Your Faithfully</div>
      <div class="company-sig-name">For Sri Krishna Constructions</div>
      <div class="sig-img-container" style="height: 48px;"></div>
      <div class="proprietor-text">Proprietor</div>
    </div>
  </div>
"""

        html += f"""
  <div class="page-footer">Page {page_num} of {total_page_count}</div>
</div><!-- .page -->
"""

    html += """
</body>
</html>
"""
    return html

def render_html_to_pdf(html_content, output_pdf_path):
    temp_html = output_pdf_path.replace(".pdf", ".temp.html")
    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    cmd = [
        EDGE_PATH,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={output_pdf_path}",
        temp_html
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(temp_html):
        try: os.remove(temp_html)
        except: pass
    if res.returncode != 0:
        raise RuntimeError(f"Edge headless failed: {res.stderr}")
    return output_pdf_path

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        input_json_path = sys.argv[1]
        output_pdf_path = sys.argv[2]
        with open(input_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        settings = data.get("settings", {})
        html = generate_invoice_html(data, settings)
        render_html_to_pdf(html, output_pdf_path)
        print("GENERATED_PDF_SUCCESS:", output_pdf_path)
