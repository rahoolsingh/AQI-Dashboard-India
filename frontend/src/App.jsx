import React, { useState, useRef, useEffect } from "react";
import {
    useMotionValue,
    useSpring,
    useTransform,
    AnimatePresence,
    motion,
} from "framer-motion";
import {
    Search,
    MapPin,
    Wind,
    Volume2,
    VolumeX,
    Play,
    Pause,
    AlertTriangle,
    Activity,
    Zap,
    Skull,
    HeartPulse,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import music from "./assets/music/music1.mp3";
import axios from "axios";

// --- Utility ---
function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// --- Glitch Text Component ---
const GlitchText = ({ text, className }) => {
    return (
        <div className={cn("relative inline-block", className)}>
            <motion.span
                className="absolute top-0 left-0 -ml-[2px] opacity-70 text-red-500"
                animate={{ x: [-2, 2, -1, 0], opacity: [0.5, 0] }}
                transition={{
                    repeat: Infinity,
                    duration: 2,
                    repeatDelay: Math.random() * 5,
                }}
            >
                {text}
            </motion.span>
            <motion.span
                className="absolute top-0 left-0 ml-[2px] opacity-70 text-cyan-500"
                animate={{ x: [2, -2, 1, 0], opacity: [0.5, 0] }}
                transition={{
                    repeat: Infinity,
                    duration: 2,
                    repeatDelay: Math.random() * 4,
                }}
            >
                {text}
            </motion.span>
            <span className="relative z-10">{text}</span>
        </div>
    );
};

// --- AQI Severity (Horror / Biological Theme) ---
const getAqiInfo = (aqi) => {
    // Standard Life Expectancy (Optimistic baseline)
    const baseLife = 85;
    // Decay Formula: Heavy penalty for high AQI
    const penalty = aqi * 0.12;
    const predictedLife = Math.max(20, (baseLife - penalty).toFixed(1)); // Floor at 20 years

    if (aqi <= 50)
        return {
            color: "text-emerald-500",
            bg: "bg-emerald-950",
            border: "border-emerald-800",
            label: "PURE",
            emoji: "🍃",
            glitch: false,
            life: predictedLife,
        };
    if (aqi <= 100)
        return {
            color: "text-yellow-500",
            bg: "bg-yellow-950",
            border: "border-yellow-800",
            label: "HAZE",
            emoji: "😷",
            glitch: false,
            life: predictedLife,
        };
    if (aqi <= 200)
        return {
            color: "text-orange-500",
            bg: "bg-orange-950",
            border: "border-orange-800",
            label: "INFECTED",
            // warning emoji triangle
            emoji: "⚠️",
            glitch: true,
            life: predictedLife,
        };
    if (aqi <= 300)
        return {
            color: "text-red-600",
            bg: "bg-red-950",
            border: "border-red-800",
            label: "FATAL",
            emoji: "☠️",
            glitch: true,
            life: predictedLife,
        };
    return {
        color: "text-purple-600",
        bg: "bg-purple-950",
        border: "border-purple-800",
        label: "TERMINAL",
        emoji: "🪦",
        glitch: true,
        life: predictedLife,
    };
};

// --- Music Player (Geiger Counter Style) ---
const MusicPlayer = ({ audioRef, isPlaying, togglePlay }) => {
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);

    const handleVolumeChange = (e) => {
        const newVol = parseFloat(e.target.value);
        setVolume(newVol);
        if (audioRef.current) audioRef.current.volume = newVol;
        setIsMuted(newVol === 0);
    };

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-6 right-6 z-50 border border-stone-700 bg-black/90 p-1 backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,1)]"
        >
            <div className="h-1 w-full bg-[repeating-linear-gradient(45deg,#000,#000_5px,#333_5px,#333_10px)] mb-2" />
            <div className="flex items-center gap-4 px-3 pb-2">
                <button
                    onClick={togglePlay}
                    className="group relative flex h-10 w-10 items-center justify-center border border-stone-600 bg-stone-900 text-stone-400 hover:text-white transition-colors"
                >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse opacity-0 group-hover:opacity-100" />
                </button>
                <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest">
                        Audio Feed
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="text-stone-500 hover:text-white"
                        >
                            {isMuted || volume === 0 ? (
                                <VolumeX size={12} />
                            ) : (
                                <Volume2 size={12} />
                            )}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="h-1 w-20 appearance-none bg-stone-800 accent-stone-400"
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// --- Dystopian Card ---
const TiltCard = ({ item }) => {
    const ref = useRef(null);
    const info = getAqiInfo(item.aqi);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseX = useSpring(x, { stiffness: 500, damping: 30 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 30 });
    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["10deg", "-10deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-10deg", "10deg"]);

    const handleMouseMove = (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
                x.set(0);
                y.set(0);
            }}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="group relative h-full perspective-1000"
        >
            <div
                className={cn(
                    "relative h-full overflow-hidden border bg-black/80 p-6 backdrop-blur-sm transition-all duration-300",
                    info.border,
                    "hover:border-opacity-100 border-opacity-40",
                )}
            >
                <div className="pointer-events-none absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20" />

                <div
                    style={{ transform: "translateZ(20px)" }}
                    className="relative z-10 flex flex-col h-full justify-between"
                >
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-white/5 pb-3">
                        <div className="flex gap-3 items-center">
                            <div className="relative">
                                <img
                                    src={item.flag}
                                    alt="flag"
                                    className="w-10 h-10 object-cover aspect-square contrast-125 opacity-80"
                                />
                                <div className="absolute inset-0 bg-stone-900/40 mix-blend-color" />
                            </div>
                            <div>
                                <h2 className="text-lg font-mono font-bold text-stone-200 tracking-tighter uppercase">
                                    {item.city}
                                </h2>
                                <p className="text-[10px] text-stone-500 font-mono flex items-center gap-1 uppercase">
                                    <MapPin size={10} /> {item.state}
                                </p>
                            </div>
                        </div>
                        {/* Emoji Display */}
                        <div className="text-3xl filter drop-shadow-lg grayscale-[0.2]">
                            {info.emoji}
                        </div>
                    </div>

                    {/* Metric */}
                    <div className="mt-6 mb-4 relative">
                        <div className="flex justify-between items-end mb-2">
                            <GlitchText
                                text={item.aqi.toString()}
                                className={cn(
                                    "text-5xl font-black font-mono tracking-tighter",
                                    info.color,
                                )}
                            />
                            <div
                                className={cn(
                                    "flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase border",
                                    info.color,
                                    info.border,
                                    "bg-black",
                                )}
                            >
                                {item.aqi > 200 && (
                                    <AlertTriangle
                                        size={10}
                                        className="animate-pulse"
                                    />
                                )}
                                {info.label}
                            </div>
                        </div>

                        {/* Gauge */}
                        <div className="relative h-2 w-full bg-stone-900 border border-stone-800">
                            <div className="absolute inset-0 flex justify-between px-1">
                                {[...Array(10)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-[1px] h-full bg-stone-800"
                                    />
                                ))}
                            </div>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                    width: `${Math.min((item.aqi / 500) * 100, 100)}%`,
                                }}
                                transition={{ duration: 1 }}
                                className={cn("relative h-full", info.bg)}
                            >
                                <div className="absolute inset-0 w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(0,0,0,0.5)_5px,rgba(0,0,0,0.5)_10px)]" />
                            </motion.div>
                        </div>
                    </div>

                    {/* Footer - Life Span */}
                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-stone-800">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-mono text-stone-600 uppercase">
                                Est. Max Life
                            </span>
                            <div className="flex items-center gap-1">
                                <HeartPulse
                                    size={12}
                                    className={
                                        info.life < 60
                                            ? "text-red-600 animate-pulse"
                                            : "text-stone-500"
                                    }
                                />
                                <span
                                    className={cn(
                                        "text-sm font-mono font-bold",
                                        info.life < 60
                                            ? "text-red-500"
                                            : "text-stone-400",
                                    )}
                                >
                                    {info.life} YRS
                                </span>
                            </div>
                        </div>
                        <span
                            className={cn(
                                "uppercase flex items-center gap-1 text-[10px]",
                                info.color,
                            )}
                        >
                            <Activity size={10} />
                            SYS: {info.glitch ? "FAIL" : "OK"}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// --- Main App ---
function App() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [showModal, setShowModal] = useState(true);
    const [data, setData] = useState(true);
    const audioRef = useRef(null);

    useEffect(() => {
        audioRef.current = new Audio(music);
        audioRef.current.loop = true;
        const handleVis = () => {
            if (document.hidden && isPlaying) audioRef.current.pause();
            else if (!document.hidden && isPlaying) audioRef.current.play();
        };
        document.addEventListener("visibilitychange", handleVis);
        return () => {
            if (audioRef.current) audioRef.current.pause();
            document.removeEventListener("visibilitychange", handleVis);
        };
    }, []);

    const handleStart = () => {
        if (audioRef.current)
            audioRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => {});
        setShowModal(false);
    };

    const backendUrl = import.meta.env.VITE_APP_BACKEND_URL;
    const fetchUrl = `${backendUrl}/api/get-aqi-data`;

    useEffect(() => {
        // Pre-fetch data on mount
        const fetchData = async () => {
            try {
                const response = await axios.get(fetchUrl);
                setData(response.data);
            } catch (error) {
                console.error("Error fetching AQI data:", error);
            }
        };
        fetchData();
    }, [fetchUrl]);

    console.log("Data:", data.data);

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-stone-300 font-sans">
                <p className="text-xl font-mono">Loading data...</p>
            </div>
        );
    }

    const filteredData = data?.data?.data
        ?.filter((item) => item.country === "India")
        ?.filter((item) =>
            item.city.toLowerCase().includes(searchTerm.toLowerCase()),
        );

    return (
        <div className="min-h-screen bg-zinc-900 text-stone-300 font-sans selection:bg-red-900/50 overflow-x-hidden relative">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
            <div className="fixed inset-0 pointer-events-none z-[90] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%]"></div>

            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] opacity-10 pointer-events-none">
                <motion.img
                    src="https://upload.wikimedia.org/wikipedia/commons/1/17/Ashoka_Chakra.svg"
                    alt="chakra"
                    className="w-full h-full filter sepia brightness-50 contrast-150"
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 120,
                        ease: "linear",
                        repeat: Infinity,
                    }}
                />
            </div>

            <div className="fixed top-0 left-0 w-full h-[400px] bg-gradient-to-b from-orange-900/20 via-black to-transparent pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-full h-[400px] bg-gradient-to-t from-green-900/20 via-black to-transparent pointer-events-none" />

            {/* --- Sarcastic Truth Modal --- */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
                    >
                        <div className="w-full max-w-lg border-2 border-red-900/50 bg-[#050505] relative shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                            {/* Decorative Hazard Corners */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-600"></div>
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-600"></div>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-600"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-600"></div>

                            <div className="p-8 text-center">
                                <p className="text-stone-400 font-mono text-sm mb-6 leading-relaxed">
                                    Embrace the delightful delusion that
                                    everything is fine while the world around us
                                    slowly decays. After all, who needs clean
                                    air and a healthy planet when you can have
                                    blissful ignorance?
                                </p>

                                {/* --- The Shlok Section --- */}
                                <div className="bg-red-950/20 border-y border-red-900/30 relative overflow-hidden group">
                                    <p className="text-amber-500 font-serif text-lg mb-2 font-bold tracking-wide py-2">
                                        || श्रीमद्भगवद्गीता 7.4 ||
                                    </p>
                                    <p className="text-stone-300 font-medium text-base mb-3 leading-relaxed italic opacity-90">
                                        भूमिरापोऽनलो वायुः खं मनो बुद्धिरेव च |
                                        <br />
                                        अहङ्कार इतीयं मे भिन्ना प्रकृतिरष्टधा ||
                                    </p>

                                    <div className="space-y-2 text-xs font-mono text-stone-500 text-left p-1">
                                        <p>
                                            <span className="text-red-400 font-bold">
                                                HINDI:
                                            </span>{" "}
                                            पृथ्वी, जल, अग्नि, वायु, आकाश, मन,
                                            बुद्धि और अहंकार - ये आठ मेरी पृथक्
                                            भौतिक ऊर्जा का निर्माण करते हैं।
                                        </p>
                                        <p>
                                            <span className="text-red-400 font-bold">
                                                ENGLISH:
                                            </span>{" "}
                                            Earth, water, fire, air, ether,
                                            mind, intellect and ego - these
                                            eight constitute My separated
                                            material energy.
                                        </p>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-4 text-xs font-mono uppercase border border-stone-800 text-stone-500 hover:text-white hover:bg-stone-900 transition-all hover:scale-[1.02]"
                                    >
                                        Ignorance is Bliss (Mute)
                                    </button>
                                    <button
                                        onClick={handleStart}
                                        className="flex-1 py-4 text-xs font-bold font-mono uppercase bg-red-600 text-black hover:bg-red-500 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-[1.02]"
                                    >
                                        Face the Reality (Play)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative z-10 container mx-auto px-4 py-16 max-w-7xl">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 border-b border-stone-800 pb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
                            <span className="text-[10px] font-mono text-red-600 uppercase tracking-widest">
                                BIOHAZARD MONITORING
                            </span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-800 via-stone-500 to-green-900 pb-2 tracking-tighter filter contrast-125">
                            <GlitchText text="VISHWA_GURU" />
                        </h1>
                        <p className="text-stone-600 font-mono text-sm max-w-2xl border-l-2 border-red-900/50 pl-4 mt-2">
                            Status:{" "}
                            <span className="text-red-500 animate-pulse">
                                CRITICAL FAILURE
                            </span>
                            <br />
                            Last Sync:{" "}
                            {new Date(data.capturedAt).toLocaleString()}
                            {/* next update expect after 6 hours from capture_time */}
                            <br />
                            Next Sync:{" "}
                            {new Date(
                                new Date(data.capturedAt).getTime() +
                                    6 * 60 * 60 * 1000,
                            ).toLocaleString()}
                        </p>
                    </div>

                    <div className="relative w-full md:w-80">
                        <div className="flex items-center bg-black border border-stone-800 px-4 py-3 group focus-within:border-red-900 transition-colors">
                            <Search
                                className="text-stone-600 mr-3 group-focus-within:text-red-500"
                                size={16}
                            />
                            <input
                                type="text"
                                placeholder="SEARCH_CITY..."
                                className="bg-transparent border-none outline-none text-stone-300 w-full placeholder-stone-700 font-mono text-sm uppercase"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredData?.map((state) => (
                        <TiltCard
                            key={state.locationId || state.location}
                            item={state}
                        />
                    ))}
                </div>

                {filteredData?.length === 0 && (
                    <div className="py-20 text-center border border-dashed border-stone-800">
                        <p className="text-xl font-mono text-stone-700 uppercase">
                            No Data Found
                        </p>
                    </div>
                )}
            </div>

            {!showModal && (
                <MusicPlayer
                    audioRef={audioRef}
                    isPlaying={isPlaying}
                    togglePlay={() => {
                        if (audioRef.current) {
                            if (isPlaying) audioRef.current.pause();
                            else audioRef.current.play();
                            setIsPlaying(!isPlaying);
                        }
                    }}
                />
            )}
        </div>
    );
}

export default App;
