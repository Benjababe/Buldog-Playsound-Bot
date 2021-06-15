# Buldog-Playsound-Bot
Reddit bot that replies playsound to playsound commands. Works for lacari's and my own custom playsounds as well. Hopefully mods don't ban it.

Just comment in the [/r/AdmiralBulldog](https://reddit.com/r/AdmiralBulldog/) subreddit like so
```
!playsound nyanya
```
or for lacari playsounds
```
!playsound lagari/lacari black
```
or even for custom playsounds
```
!playsound cs/custom diedtosniper
```
For ffmpeg/audio control to work, it needs to be given permission first. Just execute
```
chmod 777 ./private/tools/ffmpeg
```
and you should be set for playsound speed
```
!playsound lagari face 0.75
```
You can even combine them all
```
!playsound lagari face 0.75 allo 1.2 cs diedtosniper
```
will join all 3 playsounds at the set speed.

There are 3 paths so far, /custom, /updateplaysound and /upload. In this case where I'm using replit as host: https://Buldog-Playsound-Bot.benjababe.repl.co/custom
