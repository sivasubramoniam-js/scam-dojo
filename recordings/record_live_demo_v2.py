import os
import time
import subprocess
import glob
from playwright.sync_api import sync_playwright

TOTAL_TARGET_DURATION = 180.0  # Exactly 3 minutes (180 seconds)

def run_live_recording():
    os.makedirs("recordings/raw_video", exist_ok=True)
    
    # Clean previous raw videos
    for f in glob.glob("recordings/raw_video/*.webm"):
        try:
            os.remove(f)
        except Exception:
            pass

    with sync_playwright() as p:
        print("[Playwright] Launching Chromium in 1920x1080 high-def mode...")
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--window-size=1920,1080",
                "--disable-dev-shm-usage",
                "--disable-infobars"
            ]
        )
        
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir="recordings/raw_video",
            record_video_size={"width": 1920, "height": 1080},
            color_scheme="dark",
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = context.new_page()
        start_time = time.time()
        
        def sync_to(target_sec: float, description: str = ""):
            elapsed = time.time() - start_time
            remaining = target_sec - elapsed
            if remaining > 0:
                print(f"[{elapsed:.1f}s -> {target_sec:.1f}s] {description} (pausing {remaining:.2f}s)")
                time.sleep(remaining)
            else:
                print(f"[{elapsed:.1f}s] {description} (already at target)")

        # =========================================================================
        # SECTION 1: Hook & Live Sparring Paradigm (0.0s - 27.0s)
        # =========================================================================
        print("\n=== SECTION 1: Hook & Live Sparring Paradigm (0.0s - 27.0s) ===")
        page.goto("http://localhost:3000/", wait_until="networkidle")
        time.sleep(2.0)
        
        sync_to(6.0, "Showcase Hero Title & Google Antigravity IDE Badge")
        # Smooth scroll past Hero to showcase 3 Modes & Belt Mastery progression
        for y in range(0, 700, 25):
            page.evaluate(f"window.scrollTo(0, {y})")
            time.sleep(0.08)
            
        sync_to(15.0, "Showcase Belt Mastery Progression (White to 5th Dan Black Belt)")
        for y in range(700, 1350, 30):
            page.evaluate(f"window.scrollTo(0, {y})")
            time.sleep(0.08)
            
        sync_to(22.0, "Showcase Problem Statistics & Threat Meter")
        for y in range(1350, 1850, 30):
            page.evaluate(f"window.scrollTo(0, {y})")
            time.sleep(0.08)
            
        sync_to(27.0, "Transition to Section 2: Command Center & India Heatmap")

        # =========================================================================
        # SECTION 2: Command Center & India Cybercrime Heatmap (27.0s - 53.5s)
        # =========================================================================
        print("\n=== SECTION 2: Command Center & India Heatmap (27.0s - 53.5s) ===")
        page.evaluate("document.querySelector('section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })")
        time.sleep(2.0)
        
        geos = page.locator("path.rsm-geography")
        geo_count = geos.count()
        print(f"Found {geo_count} state geographies on India map")
        
        sync_to(32.0, "Hover over Maharashtra to display ₹2,450 Cr loss & NCRB telemetry")
        if geo_count > 0:
            try:
                geos.nth(15).hover(timeout=2000)
                time.sleep(3.0)
            except Exception:
                pass
                
        sync_to(38.0, "Click state to reveal localized threat vectors & helpline contacts")
        if geo_count > 0:
            try:
                geos.nth(15).click(timeout=2000)
                time.sleep(2.5)
            except Exception:
                pass

        sync_to(44.0, "Toggle metric between Financial Loss (₹ Cr) and Reported Cases (1930)")
        cases_btn = page.locator("button:has-text('Reported Cases')").or_(page.locator("button:has-text('Cases')"))
        if cases_btn.count() > 0:
            try:
                cases_btn.first.click(timeout=2000)
                time.sleep(2.5)
            except Exception:
                pass
                
        sync_to(49.0, "Toggle back to Financial Loss & view top critical states leaderboard")
        loss_btn = page.locator("button:has-text('Financial Loss')").or_(page.locator("button:has-text('Loss')"))
        if loss_btn.count() > 0:
            try:
                loss_btn.first.click(timeout=2000)
                time.sleep(2.0)
            except Exception:
                pass
                
        sync_to(53.5, "Transition to Section 3: Train Arena (3 Simulation Types)")

        # =========================================================================
        # SECTION 3: Train Arena — ALL 3 Simulation Types (53.5s - 97.5s)
        # =========================================================================
        print("\n=== SECTION 3: Train Arena — ALL 3 Simulation Types (53.5s - 97.5s) ===")
        page.goto("http://localhost:3000/train", wait_until="networkidle")
        time.sleep(1.5)
        
        # Click on Digital Arrest scenario card to initiate sparring drill
        scenario_card = page.locator("button:has-text('Digital Arrest')").or_(page.locator("button:has-text('Start Drill')")).or_(page.locator(".cursor-pointer")).first
        if scenario_card.count() > 0:
            try:
                scenario_card.click(timeout=3000)
                time.sleep(2.0)
            except Exception:
                pass

        sync_to(61.0, "Simulation Type 1: Live Chat Simulation with Adaptive LLM Coercion")
        chat_mode_btn = page.locator("button:has-text('Chat')").first
        if chat_mode_btn.count() > 0:
            try:
                chat_mode_btn.click(timeout=2000)
                time.sleep(1.5)
            except Exception:
                pass
                
        # Send a defensive counter reply in chat
        chat_input = page.locator("input[placeholder*='message']").or_(page.locator("textarea")).first
        if chat_input.count() > 0:
            try:
                chat_input.fill("I am verifying this with my legal counsel and the official police helpline before proceeding.")
                time.sleep(1.0)
                send_btn = page.locator("button:has-text('Send')").or_(page.locator("button[aria-label*='Send']")).first
                if send_btn.count() > 0:
                    send_btn.click(timeout=2000)
                    time.sleep(2.0)
            except Exception:
                pass

        sync_to(70.0, "Simulation Type 2: Audio Call Simulation with Waveforms & Tension Gauge")
        audio_btn = page.locator("button:has-text('Audio Call')").first
        if audio_btn.count() > 0:
            try:
                audio_btn.click(timeout=2000)
                time.sleep(2.5)
            except Exception:
                pass

        # Demonstrate Hang Up & Panic Redial Intimidation
        sync_to(76.0, "Demonstrate aggressive redial resistance on call hang-up")
        hangup_btn = page.locator("button[aria-label*='Decline']").or_(page.locator("button:has-text('Decline')")).or_(page.locator(".bg-rose-600")).first
        if hangup_btn.count() > 0:
            try:
                hangup_btn.click(timeout=2000)
                time.sleep(2.5)
            except Exception:
                pass

        sync_to(82.0, "Simulation Type 3: Video Call Digital Arrest with Gemini Multimodal Live")
        video_btn = page.locator("button:has-text('Video Call')").first
        if video_btn.count() > 0:
            try:
                video_btn.click(timeout=2000)
                time.sleep(3.0)
            except Exception:
                pass

        # Switch Police / Customs persona feed in Video mode
        customs_btn = page.locator("button:has-text('Customs')").first
        if customs_btn.count() > 0:
            try:
                customs_btn.click(timeout=2000)
                time.sleep(2.5)
            except Exception:
                pass

        sync_to(90.0, "Open ADK Live Multi-Agent Tracing Drawer")
        trace_btn = page.locator("button[title*='Trace']").or_(page.locator("button:has-text('Agent Trace')")).or_(page.locator("button:has-text('ADK')")).first
        if trace_btn.count() > 0:
            try:
                trace_btn.click(timeout=2000)
                time.sleep(3.0)
            except Exception:
                pass

        sync_to(97.5, "Transition to Section 4: Mode 2 Check")

        # =========================================================================
        # SECTION 4: Check Mode — Threat Score Check & Forensics (97.5s - 126.0s)
        # =========================================================================
        print("\n=== SECTION 4: Check Mode — Threat Score Check (97.5s - 126.0s) ===")
        page.goto("http://localhost:3000/check", wait_until="networkidle")
        time.sleep(1.5)
        
        sync_to(102.0, "Select suspicious message preset (Electricity Bill Phishing)")
        preset_btn = page.locator("button:has-text('Electricity')").or_(page.locator("button:has-text('Bill')")).first
        if preset_btn.count() > 0:
            try:
                preset_btn.click()
                time.sleep(2.0)
            except Exception:
                pass
        else:
            ta = page.locator("textarea").first
            if ta.count() > 0:
                ta.fill("URGENT: Your electricity power connection will be disconnected tonight at 9:30 PM due to pending KYC update. Contact electricity-dept@gmall.com immediately or call 9876543210.")
                time.sleep(1.0)
                
        sync_to(107.0, "Click Analyze Threat to compute real-time ScamScore")
        analyze_btn = page.locator("button:has-text('Analyze')").first
        if analyze_btn.count() > 0:
            try:
                analyze_btn.click(timeout=2000)
                time.sleep(3.0)
            except Exception:
                pass

        sync_to(112.0, "Showcase 0-100 ScamScore, 4-Pillar Breakdown & Search Grounding")
        for y in range(0, 500, 20):
            page.evaluate(f"window.scrollTo(0, {y})")
            time.sleep(0.08)

        sync_to(119.0, "View 1-Click WhatsApp Family Alert Poster")
        poster_btn = page.locator("button:has-text('WhatsApp')").or_(page.locator("button:has-text('Poster')")).or_(page.locator("button:has-text('Share')")).first
        if poster_btn.count() > 0:
            try:
                poster_btn.scroll_into_view_if_needed()
                time.sleep(2.0)
            except Exception:
                pass

        sync_to(123.0, "Showcase Scenario Forge ('Train Me On This Scam')")
        forge_btn = page.locator("button:has-text('Train Me On This Scam')").or_(page.locator("button:has-text('Scenario Forge')")).first
        if forge_btn.count() > 0:
            try:
                forge_btn.scroll_into_view_if_needed()
                time.sleep(2.0)
            except Exception:
                pass

        sync_to(126.0, "Transition to Section 5: Mode 3 Recover")

        # =========================================================================
        # SECTION 5: Recover Mode — Google Maps & Bank Dispute Mail Draft (126.0s - 158.0s)
        # =========================================================================
        print("\n=== SECTION 5: Recover Mode — Google Maps & Bank Dispute Mail Draft (126.0s - 158.0s) ===")
        page.goto("http://localhost:3000/recover", wait_until="networkidle")
        time.sleep(1.5)
        
        sync_to(130.0, "Showcase Golden-Hour 1930 Cyber Fraud Triage Timer")
        for y in range(0, 450, 25):
            page.evaluate(f"window.scrollTo(0, {y})")
            time.sleep(0.08)

        sync_to(135.0, "Explore Google Maps Locator for Nearby Cybercrime Police Cells")
        map_loc = page.locator("text=Physical Recovery Desks").or_(page.locator("text=Nearest Police")).first
        if map_loc.count() > 0:
            try:
                map_loc.scroll_into_view_if_needed()
                time.sleep(2.0)
            except Exception:
                pass

        # Switch to Police tab on Google Map locator
        police_tab = page.locator("button:has-text('Police')").first
        if police_tab.count() > 0:
            try:
                police_tab.click(timeout=2000)
                time.sleep(2.5)
            except Exception:
                pass

        sync_to(143.0, "Open Official Evidence Dossier & Bank Dispute Notice Generator")
        dossier_btn = page.locator("button:has-text('Build Official Police & Bank Evidence Dossier')").or_(page.locator("button:has-text('Evidence Dossier')")).first
        if dossier_btn.count() > 0:
            try:
                dossier_btn.scroll_into_view_if_needed()
                dossier_btn.click(timeout=2000)
                time.sleep(2.5)
            except Exception:
                pass

        sync_to(149.0, "Showcase Pre-filled RBI Zero-Liability Bank Dispute Mail Draft")
        # Click the Bank Dispute tab in the modal
        bank_tab = page.locator("button:has-text('Bank Dispute Letter')").first
        if bank_tab.count() > 0:
            try:
                bank_tab.click(timeout=2000)
                time.sleep(2.5)
            except Exception:
                pass

        # Copy the dispute letter
        copy_btn = page.locator("button:has-text('Copy Dispute Letter')").first
        if copy_btn.count() > 0:
            try:
                copy_btn.click(timeout=2000)
                time.sleep(2.0)
            except Exception:
                pass

        # Close the modal
        close_modal_btn = page.locator("button:has-text('Close')").or_(page.locator("button[aria-label*='Close']")).first
        if close_modal_btn.count() > 0:
            try:
                close_modal_btn.click(timeout=1500)
            except Exception:
                pass

        sync_to(158.0, "Transition to Section 6: Dojo Dashboard & Outro")

        # =========================================================================
        # SECTION 6: Dashboard, 7 ADK Agents on Cloud Run & Outro (158.0s - 180.0s)
        # =========================================================================
        print("\n=== SECTION 6: Dashboard, 7 ADK Agents & Outro (158.0s - 180.0s) ===")
        page.goto("http://localhost:3000/dashboard", wait_until="networkidle")
        time.sleep(1.5)

        sync_to(163.0, "Showcase Belt Progression Ladder (White to 5th Dan Black Belt)")
        for y in range(0, 500, 25):
            page.evaluate(f"window.scrollTo(0, {y})")
            time.sleep(0.08)

        sync_to(169.0, "Showcase AI Coach Forensic Debrief & Psychology Analytics")
        for y in range(500, 1000, 25):
            page.evaluate(f"window.scrollTo(0, {y})")
            time.sleep(0.08)

        sync_to(175.0, "Final Call to Action: scam-dojo-v2.web.app")
        page.goto("http://localhost:3000/", wait_until="networkidle")
        page.evaluate("window.scrollTo(0, 0)")
        
        sync_to(TOTAL_TARGET_DURATION, "Final 180.00s Complete")
        
        print("[Playwright] Closing browser context to flush video...")
        page.close()
        context.close()
        browser.close()
        
    print("[Playwright] Browser closed. Locating raw video...")
    webm_files = glob.glob("recordings/raw_video/*.webm")
    if not webm_files:
        raise RuntimeError("No recorded video found in recordings/raw_video/")
    
    raw_video = webm_files[0]
    print(f"Found raw video: {raw_video}")
    
    final_output = "recordings/scam_dojo_3min_presentation.mp4"
    audio_file = "recordings/audio/full_voiceover_3min.wav"
    
    print("\n[FFmpeg] Muxing video and audio with exact 180.00s timing...")
    ffmpeg_cmd = [
        "/opt/homebrew/bin/ffmpeg",
        "-y",
        "-i", raw_video,
        "-i", audio_file,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-t", "180.0",
        "-pix_fmt", "yuv420p",
        final_output
    ]
    subprocess.run(ffmpeg_cmd, check=True)
    
    probe_cmd = [
        "/opt/homebrew/bin/ffprobe",
        "-i", final_output,
        "-show_entries", "format=duration,size",
        "-v", "quiet",
        "-of", "csv=p=0"
    ]
    res = subprocess.run(probe_cmd, capture_output=True, text=True, check=True)
    out_info = res.stdout.strip().split(",")
    dur = float(out_info[0]) if len(out_info) > 0 else 0.0
    size_mb = (float(out_info[1]) / (1024 * 1024)) if len(out_info) > 1 else 0.0
    
    print("\n" + "="*65)
    print("🎉 SUCCESS! Upgraded 3-Minute Video with All Core Features Generated:")
    print(f"📁 Path: {os.path.abspath(final_output)}")
    print(f"⏱️ Duration: {dur:.2f} seconds ({dur/60:.2f} minutes)")
    print(f"📦 File Size: {size_mb:.2f} MB")
    print("="*65)

if __name__ == "__main__":
    run_live_recording()
