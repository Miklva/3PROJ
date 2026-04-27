import { useNavigate } from 'react-router-dom';
import type { Media } from '../types';
import './MediaCard.scss';

type Props = {
    media: Media;
};

export default function MediaCard({ media }: Props) {
    const navigate = useNavigate();
    const title = media.title ?? media.name ?? 'Inconnu';
    const type = media.media_type ?? 'movie';

    const handleClick = () => {
        navigate(`/media/${type}/${media.id}`);
    };

    return (
        <div className="media-card" onClick={handleClick}>
            <div className="media-card__poster">
                {media.poster_path ? (
                    <img
                        src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                        alt={title}
                    />
                ) : (
                    <div className="media-card__no-image">Aucune image</div>
                )}
            </div>
            <p className="media-card__title">{title}</p>
        </div>
    );
}
