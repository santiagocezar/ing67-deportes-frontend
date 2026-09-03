declare namespace api {
    interface ListSports {
        sports: Sport[];
    }

    interface Sport {
        id?: number;
        max_players: number;
        max_players_in_game: number;
        name: string;
    }

    interface ListTeams {
        teams: Team[];
    }

    interface Team {
        id?: number;
        name: string;
        gender_category: string;
        is_enabled: true;
        sport?: Sport;
    }
}
