import asyncio
import os
import subprocess
import edge_tts

VOICE = "en-IN-PrabhatNeural"

SECTIONS = [
    {
        "id": "sec1",
        "target_duration": 27.0,
        "text": (
            "Every single day across India, thousands fall victim to industrial fraud—digital arrests, "
            "fake electricity cutoffs, and predatory task scams. Traditional quizzes fail because static "
            "infographics do not prepare human emotion for psychological coercion. Scam Dojo changes the paradigm: "
            "practice getting scammed, safely. Enter live scenarios and spar head-to-head with an adaptive AI adversary."
        ),
    },
    {
        "id": "sec2",
        "target_duration": 26.5,
        "text": (
            "Our first stop: the Command Center. An interactive thirty-six state cybercrime heatmap of India, "
            "powered by official NCRB and 1930 telemetry, visualizes over twelve thousand crores in fraud losses. "
            "Clicking any state unveils its localized threat vectors, high-risk districts, and immediate helpline "
            "dispatch contacts, grounding personal training in geographic reality."
        ),
    },
    {
        "id": "sec3",
        "target_duration": 44.0,
        "text": (
            "On Page Two, we enter the Train Arena featuring ten grounded cybercrime scenarios. "
            "What makes Scam Dojo truly unique is its three-modal immersion engine. "
            "First, authentic WhatsApp and SMS chat simulations with live defensive counter-replies and tension gauges. "
            "Second, high-stress phone calls with live audio waveforms and realistic panic redials if you hang up. "
            "And third, full video call digital arrests powered by Gemini Multimodal Live, featuring dual Police and Customs "
            "interrogators reacting dynamically to citizen video in real time. "
            "The ADK Live Trace drawer exposes real-time agent handoffs and model reasoning."
        ),
    },
    {
        "id": "sec4",
        "target_duration": 28.5,
        "text": (
            "Next is Page Three: the Check Threat Scanner. Simply upload a suspicious SMS, invoice, or screenshot. "
            "Powered by Gemini 2.5 Flash with Google Search grounding on Vertex AI, the scanner computes an explainable "
            "zero-to-one-hundred ScamScore, unmasks lookalike typo-squatting domains, generates one-click WhatsApp family "
            "warning posters, and can forge any new real-world scam into an instant training drill."
        ),
    },
    {
        "id": "sec5",
        "target_duration": 32.0,
        "text": (
            "If money was lost, every minute counts. Page Four delivers the Golden-Hour Emergency Playbook for the critical "
            "first two hours. Victims get one-click direct dialing to India nineteen-thirty cybercrime helpline. "
            "Our integrated Google Maps locator routes directly to nearby Cybercrime Police Stations and bank escalation desks. "
            "And the Evidence Dossier generates pre-filled, RBI-compliant bank dispute letters under zero-liability guidelines "
            "for immediate account freezing."
        ),
    },
    {
        "id": "sec6",
        "target_duration": 22.0,
        "text": (
            "On the Dojo Dashboard, an AI Coach conducts forensic debriefs, advancing citizens from White Belt to Fifth Dan Black Belt. "
            "Built with seven specialized GenAI agents on Cloud Run. "
            "Practice the scam before it practices on you. Enter the dojo today at scam-dojo-v2.web.app."
        ),
    },
]

async def generate_speech():
    os.makedirs("recordings/audio", exist_ok=True)
    audio_files = []
    
    total_pad = 0.0
    for sec in SECTIONS:
        sec_id = sec["id"]
        raw_path = f"recordings/audio/{sec_id}_raw.mp3"
        padded_path = f"recordings/audio/{sec_id}_padded.wav"
        
        print(f"Generating voice for {sec_id}...")
        communicate = edge_tts.Communicate(sec["text"], VOICE, rate="+14%")
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
        target_duration = sec["target_duration"]
        pad_duration = max(0.0, target_duration - raw_duration)
        total_pad += pad_duration
        print(f"{sec_id}: raw={raw_duration:.2f}s, target={target_duration:.2f}s, padding={pad_duration:.2f}s")
        
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

    concat_list = "recordings/audio/concat_v2.txt"
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
