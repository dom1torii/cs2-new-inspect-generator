# cs2-new-inspect-generator
Try -> https://domitori.xyz/new-skins 

This app can be used to get newly added CS2 skins using items_game.txt diffs.  
By default it will try to fetch diff.diff file from `public/` folder.  
To get the diff file as quick as possible after release i recommend using SteamDB's [GameTracking-CS2](https://github.com/SteamDatabase/GameTracking-CS2/).  

On my VPS I just made a cron job that automatically fetches latest commit's diffs every 2 minutes and checks if there are any new items added. If there are, it just replaces the file in project's directory:
```bash
SHA=$(curl -sL https://api.github.com/repos/SteamTracking/GameTracking-CS2/commits/master | jq -r .sha)
TEMP=$(mktemp)
curl -sL "https://github.com/SteamDatabase/GameTracking-CS2/commit/$SHA.diff" -o "$TEMP"
if grep -q '+scripts/items/items_game.txt' "$TEMP"; then
  mv "$TEMP" path/to/project/diff.diff
else
  rm "$TEMP"
fi
```

Without dr3fty's [cs2-inspect-gen](https://github.com/dr3fty/cs2-inspect-gen) i wouldnt be able to make this.
