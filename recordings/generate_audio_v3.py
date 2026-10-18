import asyncio
import os
import subprocess
import edge_tts

VOICE = "en-IN-PrabhatNeural"

PAGES = [
    {
        "id": "page1",
        "target_duration": 18.0,
        "text": (
            "Welcome to Scam Dojo — an AI-powered cyber arena where citizens practice getting scammed, safely. "
            "Across India, over twelve thousand crores are lost annually to digital fraud. "
            "Scam Dojo builds proactive muscle memory through realistic adversarial sparring."
        ),
    },
    {
        "id": "page2",
        "target_duration": 64.0,
        "text": (
            "On Page Two, we enter the Train Arena featuring ten grounded cybercrime scenarios across our three-modal immersion engine. "
            "First, Chat Simulation: citizens engage head-to-head with an adaptive LLM adversary deploying psychological coercion, "
            "practicing real-time defensive counters while monitoring dynamic tension meters. "
            "Second, Audio Call Simulation: users experience high-stress phone calls with live audio waveforms, caller ID, "
            "and realistic panic redials if you try to hang up without complying. "
            "Third, full Video Call Digital Arrest drills powered by Gemini Multimodal Live, featuring dual-persona video feeds from "
            "Police and Customs interrogators reacting dynamically to citizen video in real time. "
            "And our floating ADK Live Trace drawer exposes real-time agent handoffs, tactical reasoning, and model latencies."
        ),
    },
    {
        "id": "page3",
        "target_duration": 32.0,
        "text": (
            "Next is Page Three: the Check Threat Scanner. Simply upload a suspicious SMS, invoice, or WhatsApp screenshot. "
            "Powered by Gemini 2.5 Flash with live Google Search grounding on Vertex AI, the scanner computes an explainable "
            "zero-to-one-hundred ScamScore, unmasks lookalike typo-squatting domains, generates one-click WhatsApp family "
            "warning posters, and can forge any new real-world scam into an instant training drill."
        ),
    },
    {
        "id": "page4",
        "target_duration": 36.0,
        "text": (
            "If money was lost, every minute counts. Page Four delivers the Golden-Hour Emergency Playbook for the critical "
            "first two hours. Victims get one-click direct dialing to India nineteen-thirty cybercrime helpline. "
            "Our integrated Google Maps locator routes directly to nearby Cybercrime Police Stations and bank escalation desks. "
            "And the Evidence Dossier generates pre-filled, RBI-compliant bank dispute letters under zero-liability guidelines "
            "for immediate account freezing."
        ),
    },
    {
        "id": "page5",
        "target_duration": 28.0,
        "text": (
            "On the Dojo Dashboard, an AI Coach conducts forensic debriefs, advancing vigilant citizens from White Belt to Fifth Dan Black Belt. "
            "Built with seven specialized GenAI agents using the Google Agent Development Kit and Gemini models deployed on Cloud Run. "
            "Practice the scam before it practices on you. Enter the dojo today at scam-dojo-v2.web.app."
        ),
    },
]

async def generate_speech():
    os.makedirs("recordings/audio", exist_ok=True)
    audio_files = []
    
    for page in PAGES:
        page_id = page["id"]
        raw_path = f"recordings/audio/{page_id}_raw.mp3"
        padded_path = f"recordings/audio/{page_id}_padded.wav"
        
        print(f"Generating voice for {page_id}...")
        communicate = edge_tts.Communicate(page["text"], VOICE, rate="+12%")
        await communicate.save(raw_path)
        
        cmd = [
            "/opt/homebrew/bin/ffprobe",
            "-i", raw_path,
            "-show_entries", "format=duration",
            "-v", "quiet",
            "-of", "csv=p=0"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        raw_duration = float(res.stdout.strip())
        target_duration = page["target_duration"]
        pad_duration = max(0.0, target_duration - raw_duration)
        print(f"{page_id}: raw={raw_duration:.2f}s, target={target_duration:.2f}s, padding={pad_duration:.2f}s")
        
        # Pad with silence at the end to make it exactly target_duration
        pad_cmd = [
            "/opt/homebrew/bin/ffmpeg",
            "-y",
            "-i", raw_path,
            "-af", f"apad=pad_dur={pad_duration}",
            "-t", str(target_duration),
            "-ar", "44100",
            "-ac", "2",
            padded_path
        ]
        subprocess.run(pad_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        audio_files.append(padded_path)

    concat_list = "recordings/audio/concat_v3.txt"
    with open(concat_list, "w") as f:
        for af in audio_files:
            f.write(f"file '{os.path.abspath(af)}'\n")
            
    final_audio = "recordings/audio/full_voiceover_3min.wav"
    concat_cmd = [
        "/opt/homebrew/bin/ffmpeg",
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list,
        "-c", "copy",
        final_audio
    ]
    subprocess.run(concat_cmd, check=True)
    
    cmd = [
        "/opt/homebrew/bin/ffprobe",
        "-i", final_audio,
        "-show_entries", "format=duration",
        "-v", "quiet",
        "-of", "csv=p=0"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    total_dur = float(res.stdout.strip())
    print(f"\nFinal Voiceover Track Generated: {final_audio}")
    print(f"Total Duration: {total_dur:.2f} seconds ({total_dur / 60:.2f} minutes)")

if __name__ == "__main__":
    asyncio.run(generate_speech())
