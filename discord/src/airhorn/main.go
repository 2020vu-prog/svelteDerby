package main

import (
	"encoding/binary"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/bwmarrin/discordgo"
	log "github.com/sirupsen/logrus"

	"github.com/davecgh/go-spew/spew"
	"github.com/fsnotify/fsnotify"
)

var token string
var paChannel chan *TriggerDiscord

const AirHornFile = "airhorn.dca"

type TriggerDiscord struct {
	ChannelName string
	DcaFilePath string
	OrigKey     string
	jsonPath    string
}

func init() {
	// Log as JSON instead of the default ASCII formatter.
	//log.SetFormatter(&log.JSONFormatter{})

	// Output to stdout instead of the default stderr
	// Can be any io.Writer, see below for File example
	log.SetOutput(os.Stdout)

	// Only log the warning severity or above.
	log.SetLevel(log.DebugLevel)

	flag.StringVar(&token, "t", "", "Bot Token")
	flag.Parse()

	paChannel = make(chan *TriggerDiscord, 9)

}

func main() {

	if token == "" {
		fmt.Println("No token provided. Please run: airhorn -t <bot token>")
		return
	}

	// Create a new Discord session using the provided bot token.
	dg, err := discordgo.New("Bot " + token)
	if err != nil {
		fmt.Println("Error creating Discord session: ", err)
		return
	}

	// Register ready as a callback for the ready events.
	dg.AddHandler(ready)

	// Register messageCreate as a callback for the messageCreate events.
	dg.AddHandler(messageCreate)

	// Register guildCreate as a callback for the guildCreate events.
	dg.AddHandler(guildCreate)

	// We need information about guilds (which includes their channels),
	// messages and voice states.
	dg.Identify.Intents = discordgo.IntentsGuilds | discordgo.IntentsGuildMessages | discordgo.IntentsGuildVoiceStates

	// Open the websocket and begin listening.
	err = dg.Open()
	if err != nil {
		fmt.Println("Error opening Discord session: ", err)
	}

	// Wait here until CTRL-C or other term signal is received.
	go recvPaSend()
	//go paLoop()
	go watchDir(".")
	fmt.Println("Airhorn is now running.  Press CTRL-C to exit.")
	sc := make(chan os.Signal, 1)
	signal.Notify(sc, syscall.SIGINT, syscall.SIGTERM, os.Interrupt, os.Kill)
	<-sc

	// Cleanly close down the Discord session.
	dg.Close()
}

// This function will be called (due to AddHandler above) when the bot receives
// the "ready" event from Discord.
func ready(s *discordgo.Session, event *discordgo.Ready) {

	// Set the playing status.
	s.UpdateGameStatus(0, "!airhorn")
	PrettyPrint("session:", s)
	PrettyPrint("event:", event)
	readySession = s
	//requestPaSend(AirHornFile)
	os.Symlink("airhorn.ORIG", AirHornFile)

}

var readySession *discordgo.Session

// print the contents of the obj
func PrettyPrint(rsn string, data interface{}) {
	fmt.Printf("%s \n", rsn)

	spew.Dump(data)
}

// This function will be called (due to AddHandler above) every time a new
// message is created on any channel that the autenticated bot has access to.
func messageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {

	// Ignore all messages created by the bot itself
	// This isn't required in this specific example but it's a good practice.
	if m.Author.ID == s.State.User.ID {
		return
	}

	// check if the message is "!airhorn"
	if strings.HasPrefix(m.Content, "!airhorn") {

		// Find the channel that the message came from.
		c, err := s.State.Channel(m.ChannelID)
		if err != nil {
			// Could not find channel.
			return
		}

		// Find the guild for that channel.
		g, err := s.State.Guild(c.GuildID)
		if err != nil {
			// Could not find guild.
			return
		}

		// Look for the message sender in that guild's current voice states.
		for _, vs := range g.VoiceStates {
			if vs.UserID == m.Author.ID {
				err = playSoundFile(s, g.ID, vs.ChannelID, AirHornFile)
				if err != nil {
					fmt.Println("Error playing sound:", err)
				}

				return
			}
		}
	}
}
func paLoop() {
	log.Debug("paLoop start.")
	for {
		time.Sleep(3 * time.Minute)
		requestPaSend(AirHornFile)

	}
}
func parseTrigger(jsonPath string) *TriggerDiscord {
	jsonBytes, err := ioutil.ReadFile(jsonPath)
	if err != nil {
		return nil
	}
	triggerDiscord := TriggerDiscord{}
	err = json.Unmarshal(jsonBytes, &triggerDiscord)
	if err != nil {
		log.Errorf("ParseTrigger error: [%v]", err)
		return nil
	}
	triggerDiscord.jsonPath = jsonPath
	return &triggerDiscord

}
func requestPaSend(dcaPath string) {
	if strings.HasSuffix(dcaPath, ".json") {

		log.Debugf("requestPaSend go file [%s]", dcaPath)
		triggerDiscord := parseTrigger(dcaPath)
		if triggerDiscord != nil {
			paChannel <- triggerDiscord
		} else {
			log.Debugf("requestPaSend ignore file parse Failed: [%s]", dcaPath)
		}
	} else {
		log.Debugf("requestPaSend ignore file [%s]", dcaPath)
	}
}

// recvPaSend should run as gofunc
func recvPaSend() {
	for {
		trigger := <-paChannel
		doPaSend(trigger)
	}
}
func scanChannels(s *discordgo.Session, tgt string) (*discordgo.Guild, *discordgo.Channel) {
	for _, g := range s.State.Guilds {
		for _, c := range g.Channels {
			log.Debugf("scanChannels g[%s] c[%s] type:[%d] seeking: [%s]", g.Name, c.Name, c.Type, tgt)
			if c.Type == 2 && c.Name == tgt {
				log.Debugf("scanChannels matched g[%s] c[%s] type:[%d]", g.ID, c.Name, c.Type)
				return g, c
			}
		}
	}
	return nil, nil
}
func findChannel(channelName string) (*discordgo.Session, *discordgo.Guild, string) {
	//c30Guild := "947934742072942654"
	//generalChannel := "947934742618193993"
	s := readySession
	if s == nil {
		fmt.Println("findChannel not ready:")
		return nil, nil, ""
	}

	g, channel := scanChannels(s, channelName)
	if g == nil || channel == nil {
		return nil, nil, ""
	}

	// Find the guild for PA
	//g, err := s.State.Guild(c30Guild)
	/*
		g, err := s.State.Guild(g.ID)
		if err != nil {
			// Could not find guild.
			fmt.Println("findChannel could not find guild:", g.ID)
			return nil, nil, ""
		}
	*/

	// Look for the message sender in that guild's current voice states.
	for _, vs := range g.VoiceStates {
		//if vs.ChannelID == generalChannel {}
		if vs.ChannelID == channel.ID {
			return s, g, vs.ChannelID
		}
	}
	fmt.Printf("findChannel worked, but no voiceState: [%s]\n", channel.ID)
	return nil, nil, ""

}
func doPaSend(triggerDiscord *TriggerDiscord) {

	log.Debugf("doPaSend start: [%s]", triggerDiscord.DcaFilePath)

	s, g, c := findChannel(triggerDiscord.ChannelName)
	if c != "" {
		err := playSoundFile(s, g.ID, c, triggerDiscord.DcaFilePath)
		if err != nil {
			log.Debug("doPaSend Error playing:", err)
			os.Exit(1)
		} else {
			log.Debugf("doPaSend Success playing [%s]", triggerDiscord.DcaFilePath)
		}

	} else {
		log.Info("No channels to play")
	}
	os.Remove(triggerDiscord.DcaFilePath)
	os.Remove(triggerDiscord.jsonPath)
}

func logString(path, data string) {
	os.WriteFile(path, []byte(data), 0644)
}

// This function will be called (due to AddHandler above) every time a new
// guild is joined.
func guildCreate(s *discordgo.Session, event *discordgo.GuildCreate) {

	log.Info("GuildCreate: %v", event)
	logString("/tmp/nowSession", spew.Sdump(event))

	if event.Guild.Unavailable {
		return
	}

	for _, channel := range event.Guild.Channels {
		if channel.ID == event.Guild.ID {
			_, _ = s.ChannelMessageSend(channel.ID, "Airhorn is ready! Type !airhorn while in a voice channel to play a sound.")
			return
		}
	}
}

// loadSound attempts to load an encoded sound file from disk.
func loadSound(soundFile string) ([][]byte, error) {
	log.Debugf("loadSound file [%s]", soundFile)
	bufferRc := make([][]byte, 0) // reset buffer

	file, err := os.Open(soundFile)
	if err != nil {
		fmt.Println("Error opening dca file :", err)
		return nil, err
	}

	var opuslen int16

	for {
		// Read opus frame length from dca file.
		err = binary.Read(file, binary.LittleEndian, &opuslen)

		// If this is the end of the file, just return.
		if err == io.EOF || err == io.ErrUnexpectedEOF {
			err := file.Close()
			if err != nil {
				return nil, err
			}
			return bufferRc, nil
		}

		if err != nil {
			fmt.Println("Error reading from dca file :", err)
			return nil, err
		}

		// Read encoded pcm from dca file.
		InBuf := make([]byte, opuslen)
		err = binary.Read(file, binary.LittleEndian, &InBuf)

		// Should not be any end of file errors
		if err != nil {
			fmt.Println("Error reading from dca file :", err)
			return nil, err
		}

		// Append encoded pcm data to the buffer.
		bufferRc = append(bufferRc, InBuf)
	}
}

var vcMap map[string]*discordgo.VoiceConnection = make(map[string]*discordgo.VoiceConnection)

// playSound plays the current buffer to the provided channel.
func playSoundFile(s *discordgo.Session, guildID, channelID string, dcaPath string) (err error) {
	buffer, loadErr := loadSound(dcaPath)
	if loadErr != nil {
		return loadErr
	}

	key := fmt.Sprintf("%s:%s", guildID, channelID)
	if _, ok := vcMap[key]; !ok {
		log.Debug("playSoundFile: opening voice channel: ", key)

		// Join the provided voice channel.
		vc, err := s.ChannelVoiceJoin(guildID, channelID, false, true)
		if err != nil {
			log.Warn("playSoundFile: failed: ", err)
			return err
		}

		// Sleep for a specified amount of time before playing the sound
		time.Sleep(250 * time.Millisecond)
		vcMap[key] = vc

	}
	vc := vcMap[key]

	// Start speaking.
	vc.Speaking(true)

	// Send the buffer data.
	for _, buff := range buffer {
		vc.OpusSend <- buff
	}

	// Stop speaking
	vc.Speaking(false)

	if !vc.Ready {
		// Sleep for a specificed amount of time before ending.
		time.Sleep(250 * time.Millisecond)

		// Disconnect from the provided voice channel.
		vc.Disconnect()
		delete(vcMap, key)
	}

	return nil
}

func watchDir(watchPath string) {

	// creates a new file watcher
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Warn("ERROR", err)
	}
	defer watcher.Close()

	//
	done := make(chan bool)

	//
	go func() {
		for {
			select {
			// watch for events
			case event := <-watcher.Events:
				log.Debugf("EVENT! [%s] %#v\n", event.Op.String(), event)
				switch event.Op {
				case fsnotify.Create:
					fallthrough
				case fsnotify.Chmod:
					requestPaSend(event.Name)
				}

				// watch for errors
			case err := <-watcher.Errors:
				log.Warn("ERROR", err)
			}
		}
	}()

	// out of the box fsnotify can watch a single file, or a single directory
	if err := watcher.Add(watchPath); err != nil {
		log.Warn("ERROR", err)
	}

	<-done
}
