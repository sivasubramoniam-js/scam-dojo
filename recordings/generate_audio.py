import asyncio
import os
import subprocess
import edge_tts

VOICE = "en-IN-PrabhatNeural"  # Clear, pleasant, authoritative Indian-English narrator

SCENES = [
    {
        "id": "scene1",
        "start": 0.0,
        "target_duration": 29.0,
        "text": (
            "Every single day, thousands fall victim to digital arrests, electricity disconnection scams, "
            "and predatory loan apps. Traditional awareness posters fail because real scams prey on fear, "
            "authority, and emotional panic. Meet Scam Dojo — an AI-powered defensive cyber arena built "
            "end-to-end with Google Antigravity IDE using Gemini 3.8 Flash, turning passive awareness into proactive muscle memory."
        ),
    },
    {
        "id": "scene2",
        "start": 29.0,
        "target_duration": 25.0,
        "text": (
            "Grounding our simulator in real-world data, our 36-State India Heatmap visualizes live NCRB and National 1930 "
            "Cyber Fraud telemetry — highlighting regional hotbeds and trending vectors like Customs drug traps and KYC phishing. "
            "From here, citizens enter our 360-degree defense loop: Train, Check, and Recover."
        ),
    },
    {
        "id": "scene3",
        "start": 54.0,
        "target_duration": 51.0,
        "text": (
            "In Train Mode, users face adaptive adversarial roleplay across Chat, Voice, and Video. "
            "Our Audio and Video drills are powered by Gemini 3.8 Live over bidirectional WebSockets. "
            "Hear the scammer's authoritative tone using Gemini’s low-latency audio synthesis, "
            "accompanied by realistic panic redials if you try to hang up. "
            "In high-stress Video drills, citizens toggle their camera — streaming live frames back to Gemini "
            "so the adversary reacts dynamically to what you do on screen! "
            "Our floating ADK Multi-Agent Trace Drawer exposes real-time tension gauges, reasoning traces, "
            "and tactical breakdowns — coaching citizens from White Belt to 5th Dan Black Belt."
        ),
    },
    {
        "id": "scene4",
        "start": 105.0,
        "target_duration": 36.0,
        "text": (
            "Received a suspicious message or screenshot? In Check Mode, our multimodal scanner leverages Gemini 2.5 Flash "
            "and live Vertex AI Google Search Grounding to detect typo-squatted domains, fake bank emails, and malicious APKs in milliseconds. "
            "It computes an explainable 4-pillar threat index and generates a downloadable WhatsApp alert poster. "
            "Best of all: with one click on Scenario Forge, the scanner immediately converts this newly discovered scam "
            "into an interactive, playable training drill!"
        ),
    },
    {
        "id": "scene5",
        "start": 141.0,
        "target_duration": 39.0,
        "text": (
            "If fraud strikes, every second in the Golden Hour counts. Recover Mode connects victims directly to the 1930 Helpline "
            "and generates automated, RBI-compliant bank dispute letters. "
            "Using integrated Google Maps, victims instantly locate and navigate to the nearest Cybercrime Police Station, "
            "local precinct, or bank branch for physical Zero-FIR filing and immediate account freeze. "
            "Built with Google Antigravity IDE and deployed live on Google Cloud Run and Firebase Hosting. "
            "Scam Dojo — Practice getting scammed, safely."
        ),
    },
]

async def generate_speech():
    os.makedirs("recordings/audio", exist_ok=True)
    audio_files = []
    
    for scene in SCENES:
        scene_id = scene["id"]
        raw_path = f"recordings/audio/{scene_id}_raw.mp3"
        padded_path = f"recordings/audio/{scene_id}_padded.wav"
        
        print(f"Generating voice for {scene_id}...")
        communicate = edge_tts.Communicate(scene["text"], VOICE, rate="+8%")
        await communicate.save(raw_path)
        
        # Check actual raw duration
        cmd = [
            "/opt/homebrew/bin/ffprobe",
            "-i", raw_path,
            "-show_entries", "format=duration",
            "-v", "quiet",
            "-of", "csv=p=0"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        raw_duration = float(res.stdout.strip())
        target_duration = scene["target_duration"]
        pad_duration = max(0.0, target_duration - raw_duration)
        print(f"{scene_id}: raw={raw_duration:.2f}s, target={target_duration:.2f}s, padding={pad_duration:.2f}s")
        
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

    # Concat all 5 padded audio files into final narration track
    concat_list = "recordings/audio/concat_list.txt"
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
    
    # Check total duration of final audio
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
