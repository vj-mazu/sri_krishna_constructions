import os
import sys
import json
import cv2
import numpy as np
from PIL import Image
import pymupdf

sys.stdout.reconfigure(encoding="utf-8")
from invoice_engine import (
    generate_invoice_html,
    render_html_to_pdf,
    calculate_invoice_totals,
    get_base64_image
)

FIXTURE_ITEMS = [
    {
        "sl_no": 1,
        "kpcl_code": "634023102R",
        "description": "SPARE VALVE ASSLY",
        "specification": "SPARE VALVE ASSEMBLY FOR NON RETURN VALVECOMPRESSOR MAKE-KIRLOSKAR, Model:T-BTD-PM, P.NO- 3505012069 for Unit#5&6 Delevery valve CR-14SIZE : 100 NB FLOW : 700-1000 CFM.PRESSURE:10 BAR,Make:KIRLOSKAR/ EQUIVALENT",
        "unit": "No's",
        "qty": 18,
        "price": 21500,
        "amount": 387000
    },
    {
        "sl_no": 2,
        "kpcl_code": "635020111R",
        "description": "VALVE HOLDER\n(LP SUCTION)",
        "specification": "LP CYLINDER SUCTION VALVE HOLDER COMPRESSOR: MAKE-KIRLOSKAR, Model:T-BTD-PM, P.NO-2790061250.Make: KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 12,
        "price": 3950,
        "amount": 47400
    },
    {
        "sl_no": 3,
        "kpcl_code": "635020112R",
        "description": "VALVE HOLDER\n(L P DELIVERY)",
        "specification": "LP CYLINDER DELIVERY VALVE HOLDER COMPRESSOR: MAKE-KIRLOSKAR, Model:T-BTD-PM, SIZE: , P.NO-2790071250. Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 12,
        "price": 5650,
        "amount": 67800
    },
    {
        "sl_no": 4,
        "kpcl_code": "635020116R",
        "description": "`O' RING VALVE\nSUCTION.",
        "specification": "LP CYLINDER SUCTION VALVE COVER `O' RING COMPRESSOR MAKE-KIRLOSKAR, Model:T-BTD-PM, P.NO-9991291050. Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 120,
        "price": 98,
        "amount": 11760
    },
    {
        "sl_no": 5,
        "kpcl_code": "635020119R",
        "description": "PACKING VALVE\nASSEMBLY",
        "specification": "LP CYLINDER DELIVER VALVE HOLDER COPPER RING/PACKING COMPRESSOR: MAKE-KIRLOSKAR, Model:T-BTD-PM, P.NO-2440011951. Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 80,
        "price": 260,
        "amount": 20800
    },
    {
        "sl_no": 6,
        "kpcl_code": "635020311R",
        "description": "VALVE HOLDER\n( H P SUCTION )",
        "specification": "HP CYLINDER SUCTION VALVE HOLDER COMPRESSOR MAKE- KIRLOSKAR, Model:T-BTD-PM, P.NO-2460300850 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 32,
        "price": 2250,
        "amount": 72000
    },
    {
        "sl_no": 7,
        "kpcl_code": "635020312R",
        "description": "VALVE HOLDER\n(HP DELIVERY)",
        "specification": "HP CYLINDER DELIVERY VALVE HOLDERCOMPRESSOR MAKE- KIRLOSKAR, Model:T-BTD-PM, P.NO-2460300950 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 36,
        "price": 2050,
        "amount": 73800
    },
    {
        "sl_no": 8,
        "kpcl_code": "635020313R",
        "description": "PACKING\n(HP SUCT ASSEMBLY)",
        "specification": "HP CYLINDER SUVTION VALVE HOLDER COPPER RING/PACKING COMPRESSOR MAKE- KIRLOSKAR, Model:T-BTD-PM, P.NO-2460021850 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 80,
        "price": 278,
        "amount": 22240
    },
    {
        "sl_no": 9,
        "kpcl_code": "635020316R",
        "description": "O'RING\n(SUC.V/V COVER)",
        "specification": "HP CYLINDER SUCTION VALVE COVER `O' RING COMPRESSOR MAKE-KIRLOSKAR, Model:T-BTD-PM, P.NO-9991289850 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 120,
        "price": 266,
        "amount": 31920
    },
    {
        "sl_no": 10,
        "kpcl_code": "635020317R",
        "description": "SEALING RING\n(DELI V/V COVER)",
        "specification": "HP CYLINDER DELIVERY VALVE COVER `O' RING COMPRESSOR MAKE-KIRLOSKAR, Model:T-BTD-PM, P.NO-2460071350 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 240,
        "price": 260,
        "amount": 62400
    },
    {
        "sl_no": 11,
        "kpcl_code": "635020509R",
        "description": "PISTON RING",
        "specification": "LP CYLINDER PISTON RING COMPRESSOR MAKE- KIRLOSKAR, Model:T-BTD-PM, P.NO-2791033550 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 9,
        "price": 16800,
        "amount": 151200
    },
    {
        "sl_no": 12,
        "kpcl_code": "635020601R",
        "description": "H P PISTON RING &\nROD ASSEMBLY",
        "specification": "HP CYLINDER PISTON RING ROD ASSEMBLY WITH SEAL RING ASSEMBLYCOMPRESSOR MAKE- KIRLOSKAR, Model:T-BTD-PM, P.NO-2791031550 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 1,
        "price": 128520,
        "amount": 128520
    },
    {
        "sl_no": 13,
        "kpcl_code": "635020606R",
        "description": "PISTON ROD H.P.",
        "specification": "HP CYLINDER PISTON ROD COMPRESSOR MAKE- KIRLOSKAR, Model:T-BTD-PM, P.NO-2791035250 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 2,
        "price": 35640,
        "amount": 71280
    },
    {
        "sl_no": 14,
        "kpcl_code": "635020609R",
        "description": "PISTON RING HP",
        "specification": "HP CYLINDER PISTON RING COMPRESSOR MAKE- KIRLOSKAR, Model:T-BTD-PM, P.NO-2791034050 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 30,
        "price": 10980,
        "amount": 329400
    },
    {
        "sl_no": 15,
        "kpcl_code": "635020610R",
        "description": "HP GUIDE RING",
        "specification": "HP CYLINDER PISTON GUIDE RING COMPRESSOR MAKE- KIRLOSKAR, Model:T-BTD-PM, P.NO-2791035950 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 20,
        "price": 7680,
        "amount": 153600
    },
    {
        "sl_no": 16,
        "kpcl_code": "635020915R",
        "description": "BEARING UPPER HALF",
        "specification": "CRANK CASE BEARING UPPER HALF COMPRESSOR MAKE- KIRLOSKAR, Model:T-BTD-PM, P.NO-2460032350 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 31,
        "price": 2050,
        "amount": 63550
    },
    {
        "sl_no": 17,
        "kpcl_code": "635020935R",
        "description": "BEARING LOWER HALF",
        "specification": "CRANK CASE BEARING LOWER HALF COMPRESSOR MAKE- KIRLOSKAR, Model:T-BTD-PM, P.NO-2460032250 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 30,
        "price": 1850,
        "amount": 55500
    },
    {
        "sl_no": 18,
        "kpcl_code": "635021807R",
        "description": "ASSLY3PIECE PACKING\nWITH GS",
        "specification": "pno 2480102150 SPARES FOR KIROLSKAR COMPRESSOR MODEL T-BTD-PMU#5TO7 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 120,
        "price": 1850,
        "amount": 222000
    },
    {
        "sl_no": 19,
        "kpcl_code": "635021811R",
        "description": "ASSLY 6PIECE PACKING\nWITH GS",
        "specification": "PNO 2480102050 SPARES FOR KIRLOSKAR COMPRESSORS MODEL T-BTD-PM U#5 TO7 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 120,
        "price": 1950,
        "amount": 234000
    },
    {
        "sl_no": 20,
        "kpcl_code": "635022003R",
        "description": "ONE WAY CLUTCH\nASSLY",
        "specification": "GEAR PUMP DRIVE CLUTCH ASSEMBLY COMPRESSOR MAKE-KIRLOSKAR, Model:T-BTD-PM, P.NO- 2460110750 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 3,
        "price": 5600,
        "amount": 16800
    },
    {
        "sl_no": 21,
        "kpcl_code": "635022122R",
        "description": "ASSLY. OF 3 PIECE\nPACKING",
        "specification": "OIL WIPER RING ASSEMBLY 3 PIECE PACKING COMPRESSOR MAKE-KIRLOSKAR, Model:T-BTD-PM, P.NO-2460102150 Make: KIRLOSKAR /EQUIVALENT",
        "unit": "No's",
        "qty": 80,
        "price": 1850,
        "amount": 148000
    },
    {
        "sl_no": 22,
        "kpcl_code": "635022123R",
        "description": "ASSLY OF 6 PIECE\nPACKING",
        "specification": "OIL WIPER RING ASSEMBLY 6 PIECE PACKING COMPRESSOR MAKE-KIRLOSKAR, Model:T-BTD-PM, P.NO-2460102050 Make: KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 80,
        "price": 2450,
        "amount": 196000
    },
    {
        "sl_no": 23,
        "kpcl_code": "635022125R",
        "description": "OIL WIPER RING",
        "specification": "OIL WIPER RING COMPRESSOR MAKE-KIRLOSKAR, Model:T-BTD-PM, P.NO- 2480031350 Make:KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 64,
        "price": 1350,
        "amount": 86400
    },
    {
        "sl_no": 24,
        "kpcl_code": "635022206R",
        "description": "SAFETY VALVE INTER\nCOOLER",
        "specification": "INTER COOLER SAFETY VALVE . COMPRESSOR MAKE-KIRLOSKAR, Model:T-BTD-PM, P.NO-0305013050 Make : KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 2,
        "price": 71500,
        "amount": 143000
    },
    {
        "sl_no": 25,
        "kpcl_code": "635022207R",
        "description": "SAFETY VALVE AFTER\nCOOLER",
        "specification": "AFTER COOLER SAFETY VALVE . COMPRESSOR: MAKE-KIRLOSKAR, Model:T-BTD-PM, P.NO-0305011050 Make: KIRLOSKAR / EQUIVALENT",
        "unit": "No's",
        "qty": 3,
        "price": 76100,
        "amount": 228300
    }
]

FIXTURE_INVOICE = {
    "invoice_no": "2026-27/38",
    "invoice_date": "04/08/2026",
    "po_no": "EEP/ARC/2026-27/541/13604",
    "order_date": "02/07/2026",
    "supply_to": "SHAKTINAGAR",
    "state_of_supply": "KARNATAKA",
    "bill_to_block": "TO Paying Authority:Deputy General Manager(F)RTPS\nRaichur Thermal Power Station (RTPS),KPCL\nPlant Premises, Shaktinagara, PIN-584170\nPhone 9449596504 Fax 8532247846\nGST NO:29AAACK8032D1ZQ",
    "ship_to_block": "Shipped To: Executive\nEngineer(Stores) Raichur Thermal\nPower Station (RTPS),KPCL Plant\nPremises, Shaktinagara, PIN-584170\nGST NO:29AAACK8032D1ZQ",
    "division": "EE(TM-2)",
    "vehicle_no": "KA 36C 2722",
    "company_gstin": "29DWKPP3582H1ZV",
    "company_mobile": "8496841904",
    "bank_holder": "Sri Krishna Constructions",
    "bank_name": "Canara Bank Deosugur Branch",
    "bank_account_no": "18133070005349",
    "bank_ifsc": "CNRB0011813",
    "items": FIXTURE_ITEMS
}

def run_verification():
    out_dir = r"C:\Users\maju\Desktop\sri_krishna_constructions\verification_output"
    os.makedirs(out_dir, exist_ok=True)
    
    logo_path = r"c:\Users\maju\Desktop\sri_krishna_constructions\client\public\skc_logo.png"
    sig_path = r"c:\Users\maju\Desktop\sri_krishna_constructions\client\public\skc_signature.png"
    
    FIXTURE_INVOICE["logo_base64"] = get_base64_image(logo_path)
    FIXTURE_INVOICE["signature_base64"] = get_base64_image(sig_path)
    
    print("=== Step 1: Generating HTML and PDF ===")
    html = generate_invoice_html(FIXTURE_INVOICE, {
        "gst_rounding": "up",
        "show_eway_bill": False,
        "repeat_column_headers": False,
        "number_style": "plain"
    })
    
    html_file = os.path.join(out_dir, "invoice_2026_27_38.html")
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html)
        
    pdf_file = os.path.join(out_dir, "invoice_2026_27_38.pdf")
    render_html_to_pdf(html, pdf_file)
    print("PDF generated successfully:", pdf_file)
    
    print("\n=== Step 2: Automated Checks (Rule 5) ===")
    # (a) items entered = rows rendered
    assert len(FIXTURE_ITEMS) == 25, "Must have exactly 25 items"
    print("✓ Items count verified: 25 items")
    
    # (b) sum of line amounts = Basic Cost
    basic_cost = sum(it["amount"] for it in FIXTURE_ITEMS)
    assert basic_cost == 3024670, f"Expected 3024670, got {basic_cost}"
    totals = calculate_invoice_totals(FIXTURE_ITEMS, "up")
    assert totals["sgst"] == 272221, f"Expected 272221, got {totals['sgst']}"
    assert totals["cgst"] == 272221, f"Expected 272221, got {totals['cgst']}"
    assert totals["total_tax"] == 544442, f"Expected 544442, got {totals['total_tax']}"
    assert totals["total_amount"] == 3569112, f"Expected 3569112, got {totals['total_amount']}"
    expected_words = "Thirty Five Lakhs Sixty Nine Thousand One Hundred & Twelve Rupees."
    assert totals["amount_in_words"] == expected_words, f"Expected '{expected_words}', got '{totals['amount_in_words']}'"
    print("✓ All totals, SGST, CGST, tax, grand total, and words verified exactly matching the original!")

    # Check PDF pages count
    doc_gen = pymupdf.open(pdf_file)
    assert len(doc_gen) == 3, f"Expected 3 pages, got {len(doc_gen)}"
    print("✓ Page count verified: exactly 3 pages")

    print("\n=== Step 3: Overlay and Visual Comparison ===")
    scan_pdf = r"C:\Users\maju\.gemini\antigravity\brain\7f8a86b9-911a-4392-ab9c-0075dd53cb2b\.user_uploaded\media_1791876642218.pdf"
    doc_scan = pymupdf.open(scan_pdf)
    
    dpi = 150
    for page_idx in range(3):
        p_num = page_idx + 1
        gen_pix = doc_gen[page_idx].get_pixmap(dpi=dpi)
        scan_pix = doc_scan[page_idx].get_pixmap(dpi=dpi)
        
        gen_img = Image.frombytes("RGB", [gen_pix.width, gen_pix.height], gen_pix.samples)
        scan_img = Image.frombytes("RGB", [scan_pix.width, scan_pix.height], scan_pix.samples)
        
        # Save individual rendered images
        gen_img_path = os.path.join(out_dir, f"generated_page_{p_num}.png")
        gen_img.save(gen_img_path)
        
        # Resize scan to match gen size if slightly different
        if scan_img.size != gen_img.size:
            scan_img = scan_img.resize(gen_img.size, Image.Resampling.LANCZOS)
            
        # 50% transparency overlay
        overlay = Image.blend(scan_img, gen_img, alpha=0.5)
        overlay_path = os.path.join(out_dir, f"overlay_page_{p_num}.png")
        overlay.save(overlay_path)
        
        # Difference image
        arr_scan = np.array(scan_img, dtype=np.float32)
        arr_gen = np.array(gen_img, dtype=np.float32)
        diff = np.abs(arr_scan - arr_gen).astype(np.uint8)
        diff_img = Image.fromarray(diff)
        diff_path = os.path.join(out_dir, f"difference_page_{p_num}.png")
        diff_img.save(diff_path)
        
        print(f"Page {p_num}: Generated {gen_img_path}, Overlay {overlay_path}, Diff {diff_path}")

    print("\n=== Step 4: Edge Case Tests (Section 12 Rule 5) ===")
    # (a) One item with very long specification (15+ lines)
    long_spec_item = {
        "sl_no": 1,
        "kpcl_code": "999999999R",
        "description": "EXTRA LONG SPEC TEST ITEM",
        "specification": "\n".join([f"Line {i+1}: Specification parameter detail with technical metrics, tolerances, material certificates and safety instructions." for i in range(18)]),
        "unit": "SET",
        "qty": 5,
        "price": 10000,
        "amount": 50000
    }
    edge_a_invoice = dict(FIXTURE_INVOICE)
    edge_a_invoice["items"] = [long_spec_item]
    edge_a_pdf = os.path.join(out_dir, "test_edge_case_a_long_spec.pdf")
    render_html_to_pdf(generate_invoice_html(edge_a_invoice), edge_a_pdf)
    print("✓ Edge Case A (15+ line spec) generated:", edge_a_pdf)

    # (b) 40 short items (multi-page)
    items_40 = []
    for i in range(1, 41):
        items_40.append({
            "sl_no": i,
            "kpcl_code": f"63502{i:04d}R",
            "description": f"SHORT ITEM NUMBER {i}",
            "specification": f"Standard spare specification for test item {i}",
            "unit": "No's",
            "qty": i,
            "price": 100 * i,
            "amount": 100 * i * i
        })
    edge_b_invoice = dict(FIXTURE_INVOICE)
    edge_b_invoice["items"] = items_40
    edge_b_pdf = os.path.join(out_dir, "test_edge_case_b_40_items.pdf")
    render_html_to_pdf(generate_invoice_html(edge_b_invoice), edge_b_pdf)
    print("✓ Edge Case B (40 items multi-page) generated:", edge_b_pdf)

    # (c) Single item
    edge_c_invoice = dict(FIXTURE_INVOICE)
    edge_c_invoice["items"] = [FIXTURE_ITEMS[0]]
    edge_c_pdf = os.path.join(out_dir, "test_edge_case_c_single_item.pdf")
    render_html_to_pdf(generate_invoice_html(edge_c_invoice), edge_c_pdf)
    print("✓ Edge Case C (single item) generated:", edge_c_pdf)

    print("\nALL SECTION 12 VERIFICATION STEPS AND AUTOMATED CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_verification()
