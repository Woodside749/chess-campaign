# Picks puzzles for Puzzle Trials from the Lichess puzzle database (public domain, CC0).
#
# Run it from the project folder (the database is about 260 MB to download):
#   curl -sL https://database.lichess.org/lichess_db_puzzle.csv.zst | zstd -dc | python3 scripts/pick-puzzles.py > src/puzzles/puzzles.json
#
# It reads the database as it streams in (nothing big is saved), keeps only popular,
# well-tested puzzles, sorts them into three difficulty bands and picks a random sample
# from each. The same seed gives the same picks every time.
#
# Each Lichess puzzle is: FEN, then Moves in UCI form. The first move is the opponent's,
# which sets up the puzzle; after that the player's and opponent's moves alternate.

import csv
import json
import random
import sys

BANDS = {  # name: (lowest rating, highest rating, most moves in the solution line)
    'easy': (600, 800, 6),
    'medium': (800, 1100, 8),
    'hard': (1100, 1400, 8),
}
PER_BAND = 120  # puzzles kept per band
ENOUGH = 3000  # stop reading once every band has this many candidates
MIN_POPULARITY = 85  # Lichess players' thumbs up, from -100 to 100
MIN_PLAYS = 500
MAX_RATING_DEVIATION = 90  # lower means the rating is more certain

candidates = {band: [] for band in BANDS}
for row in csv.DictReader(sys.stdin):
    try:
        rating = int(row['Rating'])
        good = (
            int(row['Popularity']) >= MIN_POPULARITY
            and int(row['NbPlays']) >= MIN_PLAYS
            and int(row['RatingDeviation']) <= MAX_RATING_DEVIATION
        )
    except (KeyError, ValueError):
        continue
    if not good:
        continue
    moves = row['Moves'].split()
    for band, (low, high, max_moves) in BANDS.items():
        if low <= rating < high and len(moves) <= max_moves and len(candidates[band]) < ENOUGH:
            candidates[band].append({
                'id': row['PuzzleId'],
                'fen': row['FEN'],
                'moves': moves,
                'rating': rating,
                'themes': row['Themes'].split(),
            })
    if all(len(found) >= ENOUGH for found in candidates.values()):
        break

random.seed(2026)
picked = {band: sorted(random.sample(found, min(PER_BAND, len(found))), key=lambda p: p['rating'])
          for band, found in candidates.items()}
json.dump(picked, sys.stdout, separators=(',', ':'))
print(file=sys.stderr)
for band, puzzles in picked.items():
    print(f'{band}: {len(puzzles)} puzzles (from {len(candidates[band])} candidates)', file=sys.stderr)
