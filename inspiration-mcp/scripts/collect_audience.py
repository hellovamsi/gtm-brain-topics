"""Local entry point for audience discovery with the shared journal and credit limit."""
import argparse
import json

from collect_focus import collect_audience

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("audience")
    parser.add_argument("profiles", type=json.loads)
    parser.add_argument("max_credits", type=int)
    args = parser.parse_args()
    print(collect_audience(args.audience, args.profiles, args.max_credits))
