import { useEffect, useState } from 'react'
import axios from 'axios';
import type { Media } from "../types";
import "./Home.scss";
import Button from "../components/Button";
import MediaCard from "../components/MediaCard";

export default function Home() {

    const [feed, setFeed] = useState<Media[]>([]);
    const [limited, setLimited] = useState(true);

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const res = await axios.get("/api/media/trending");
                limited ? setFeed(res.data.results.slice(0, 5)) : setFeed(res.data.results.slice(0, 20));
            } catch (error) { console.error(error) }
        };
        fetchFeed();
    }, [limited]);

    return (
        <div>
            <section className="tendance">
                <h2 className="titre">Tendances</h2>

                <div className="grille">
                    {feed.map((media) => (
                        <MediaCard key={media.id} media={media} />
                    ))}
                </div>

                <Button onClick={() => setLimited(prev => !prev)}>
                    {limited ? "Voir Plus" : "Voir Moins"}
                </Button>
            </section>
        </div>
    );
}
