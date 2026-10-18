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

        print("=== SCENE 1: Hook & The Crisis (0s - 29s) ===")
        page.goto("http://localhost:3000/", wait_until="networkidle")
        time.sleep(2.0)
        
        # Smooth scroll past Hero to showcase problem statistics & modes
        for y in range(0, 750, 25):
            page.evaluate(f"window.scrollTo(0, {y})")
            time.sleep(0.08)
        
        sync_to(14.0, "Showcase Belt Mastery Progression and Mode Cards")
        for y in range(750, 1400, 30):
            page.evaluate(f"window.scrollTo(0, {y})")
            time.sleep(0.08)
            
        sync_to(24.0, "Showcase Problem Statistics")
        for y in range(1400, 1950, 35):
            page.evaluate(f"window.scrollTo(0, {y})")
            time.sleep(0.08)
            
        sync_to(29.0, "Transition to Scene 2: India Scam Map")

        print("=== SCENE 2: Interactive India Scam Heatmap (29s - 54s) ===")
        # Scroll down directly to the India Map
        page.evaluate("document.querySelector('section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })")
        time.sleep(2.0)
        
        # Hover over interactive SVG state paths (e.g. Maharashtra)
        geos = page.locator("path.rsm-geography")
        geo_count = geos.count()
        print(f"Found {geo_count} state geographies on India map")
        
        if geo_count > 0:
            # Hover over a few prominent states
            try:
                geos.nth(15).hover(timeout=2000)
                time.sleep(2.5)
            except Exception as e:
                print(f"Hover error: {e}")
                
        sync_to(39.0, "Toggle metric from Financial Loss to Reported Cases")
        # Click the cases metric button
        cases_btn = page.locator("button:has-text('Reported Cases')").or_(page.locator("button:has-text('Cases')"))
        if cases_btn.count() > 0:
            try:
                cases_btn.first.click(timeout=2000)
                time.sleep(2.5)
            except Exception:
                pass
                
        sync_to(45.0, "Explore state dossier and leaderboard")
        loss_btn = page.locator("button:has-text('Financial Loss')").or_(page.locator("button:has-text('Loss')"))
        if loss_btn.count() > 0:
            try:
                loss_btn.first.click(timeout=2000)
            except Exception:
                pass
                
        sync_to(54.0, "Transition to Scene 3: Mode 1 Train")

        print("=== SCENE 3: Mode 1 - Train (Live Cyber Arena) (54s - 105s) ===")
        page.goto("http://localhost:3000/train", wait_until="networkidle")
        time.sleep(2.0)
        
        # Show Immersion modes: Chat, Audio, Video
        sync_to(60.0, "Select Audio Call immersion tab")
        audio_btn = page.locator("button:has-text('Audio Call')")
        if audio_btn.count() > 0:
            audio_btn.first.click()
            time.sleep(2.0)
            
        # Click on the first scenario card to initiate drill
        scenario_card = page.locator("button:has-text('Digital Arrest')").or_(page.locator("button:has-text('Start Drill')")).or_(page.locator(".cursor-pointer")).first
        if scenario_card.count() > 0:
            try:
                scenario_card.click(timeout=3000)
                time.sleep(3.0)
            except Exception:
                pass

        sync_to(75.0, "Demonstrate Audio Call Phone stage, waveform and hangup redial")
        hangup_btn = page.locator("button[aria-label*='Decline']").or_(page.locator("button:has-text('Decline')")).or_(page.locator(".bg-rose-600"))
        if hangup_btn.count() > 0:
            try:
                hangup_btn.first.click(timeout=2000)
                time.sleep(2.0)
            except Exception:
                pass
                
        sync_to(83.0, "Switch to Video Call Mode")
        video_btn = page.locator("button:has-text('Video Call')")
        if video_btn.count() > 0:
            try:
                video_btn.first.click(timeout=2000)
                time.sleep(3.0)
            except Exception:
                pass
                
        sync_to(92.0, "Open ADK Live Multi-Agent Tracing Drawer")
        # Click ADK Live Tracing button in bottom-right
        trace_btn = page.locator("button[title*='Trace']").or_(page.locator("button:has-text('Agent Trace')")).or_(page.locator("button:has-text('ADK')"))
        if trace_btn.count() > 0:
            try:
                trace_btn.first.click(timeout=2000)
                time.sleep(3.0)
            except Exception:
                pass
                
        sync_to(105.0, "Transition to Scene 4: Mode 2 Check")

        print("=== SCENE 4: Mode 2 - Check (Forensic Threat Scanner) (105s - 141s) ===")
        page.goto("http://localhost:3000/check", wait_until="networkidle")
        time.sleep(2.0)
        
        # Click on one of the quick presets (e.g. Electricity bill scam)
        sync_to(112.0, "Select Electricity Bill scam preset for instant OCR & forensic verification")
        preset_btn = page.locator("button:has-text('Electricity')").or_(page.locator("button:has-text('Bill')")).first
        if preset_btn.count() > 0:
            preset_btn.click()
            time.sleep(3.0)
        else:
            # Type into input area
            ta = page.locator("textarea").first
            if ta.count() > 0:
                ta.fill("URGENT: Your electricity power connection will be disconnected tonight at 9:30 PM due to pending KYC update. Contact electricity-dept@gmall.com immediately or call 9876543210.")
                time.sleep(1.0)
                analyze_btn = page.locator("button:has-text('Analyze')").first
                if analyze_btn.count() > 0:
                    analyze_btn.click()
                    time.sleep(3.0)

        sync_to(124.0, "Review 96/100 ScamScore, 4-Pillar Breakdown & Search Grounding")
        for y in range(0, 500, 20):
            page.evaluate(f"window.scrollTo(0, {y})")
            time.sleep(0.08)
            
        sync_to(134.0, "Highlight Scenario Forge ('Train Me On This Scam')")
        forge_btn = page.locator("button:has-text('Train Me On This Scam')").or_(page.locator("button:has-text('Scenario Forge')"))
        if forge_btn.count() > 0:
            try:
                forge_btn.first.scroll_into_view_if_needed()
                time.sleep(2.0)
            except Exception:
                pass
            
        sync_to(141.0, "Transition to Scene 5: Mode 3 Recover")

        print("=== SCENE 5: Mode 3 - Recover & Emergency Playbook (141s - 180s) ===")
        page.goto("http://localhost:3000/recover", wait_until="networkidle")
        time.sleep(2.0)
        
        sync_to(148.0, "Showcase Golden-Hour 1930 Cyber Fraud Triage")
        for y in range(0, 600, 25):
            page.evaluate(f"window.scrollTo(0, {y})")
            time.sleep(0.08)
            
        sync_to(155.0, "Explore Google Maps Locator for Nearby Cybercrime Police Station & Bank")
        # Scroll to Physical Locations Map
        map_loc = page.locator("text=Physical Recovery Desks").or_(page.locator("text=Nearest Police"))
        if map_loc.count() > 0:
            try:
                map_loc.first.scroll_into_view_if_needed()
                time.sleep(2.0)
            except Exception:
                pass
            
        # Switch tab to Police Station
        police_tab = page.locator("button:has-text('Police')")
        if police_tab.count() > 0:
            try:
                police_tab.first.click(timeout=2000)
                time.sleep(2.5)
            except Exception:
                pass
                
        sync_to(168.0, "Showcase Zero-FIR Filing Protocol & Evidence Dossier")
        for y in range(600, 1100, 25):
            page.evaluate(f"window.scrollTo(0, {y})")
            time.sleep(0.08)
            
        sync_to(176.0, "Closing final view: Full Stack AI Resilience")
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        
        sync_to(TOTAL_TARGET_DURATION, "Final 180.00s Complete")
        
        print("[Playwright] Closing context to finalize video recording...")
        page.close()
        context.close()
        browser.close()
        
    print("[Playwright] Browser closed. Looking for raw recorded video...")
    webm_files = glob.glob("recordings/raw_video/*.webm")
    if not webm_files:
        raise RuntimeError("No recorded video found in recordings/raw_video/")
    
    raw_video = webm_files[0]
    print(f"Found raw video: {raw_video}")
    
    final_output = "recordings/scam_dojo_3min_presentation.mp4"
    audio_file = "recordings/audio/full_voiceover_3min.wav"
    
    print("\n[FFmpeg] Muxing video and audio with precise timing...")
    # Merge video and audio into a high-quality MP4 file
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
    
    # Check final duration & size
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
    
    print("\n" + "="*60)
    print("🎉 SUCCESS! Final Live 3-Minute Video Generated:")
    print(f"📁 Path: {os.path.abspath(final_output)}")
    print(f"⏱️ Duration: {dur:.2f} seconds ({dur/60:.2f} minutes)")
    print(f"📦 File Size: {size_mb:.2f} MB")
    print("="*60)

if __name__ == "__main__":
    run_live_recording()
