import { useEffect, useState } from 'react'
import axios from 'axios';
import type { Media } from "../types";
import "./Home.scss";
import Button from "../components/Button";

export default function Home() {

    const [feed, setFeed] = useState<Media[]>([]);
    const [limited, setLimited] = useState(true);

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const res = await axios.get(
                    "https://api.themoviedb.org/3/trending/all/week",
                    {
                        params: {
                            api_key: import.meta.env.VITE_TMDB_API_KEY
                        }
                    }
                );
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
                        <div className="carte" key={media.id}>
                            <div className="poster">
                                <img
                                    src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                                    alt={media.title || media.name || "Inconnu"}
                                />
                            </div>

                            <h3 className="nom">
                                {media.title || media.name || "Inconnu"}
                            </h3>
                        </div>
                    ))}
                </div>

                <Button onClick={() => setLimited(prev => !prev)}>
                    {limited ? "Voir Plus" : "Voir Moins"}
                </Button>
            </section>
        </div>
    );
}