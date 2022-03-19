package main

import "github.com/deadmanssnitch/snshttp"
import "net/http"
import "fmt"
import "time"
import "io/ioutil"
import "context"
import "encoding/json"
import (
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/sns"

	"flag"
	"os"
)

type S3Notify struct {
	Records []struct {
		EventVersion string    `json:"eventVersion"`
		EventSource  string    `json:"eventSource"`
		AwsRegion    string    `json:"awsRegion"`
		EventTime    time.Time `json:"eventTime"`
		EventName    string    `json:"eventName"`
		UserIdentity struct {
			PrincipalID string `json:"principalId"`
		} `json:"userIdentity"`
		RequestParameters struct {
			SourceIPAddress string `json:"sourceIPAddress"`
		} `json:"requestParameters"`
		ResponseElements struct {
			XAmzRequestID string `json:"x-amz-request-id"`
			XAmzID2       string `json:"x-amz-id-2"`
		} `json:"responseElements"`
		S3 struct {
			S3SchemaVersion string `json:"s3SchemaVersion"`
			ConfigurationID string `json:"configurationId"`
			Bucket          struct {
				Name          string `json:"name"`
				OwnerIdentity struct {
					PrincipalID string `json:"principalId"`
				} `json:"ownerIdentity"`
				Arn string `json:"arn"`
			} `json:"bucket"`
			Object struct {
				Key       string `json:"key"`
				Size      int    `json:"size"`
				ETag      string `json:"eTag"`
				VersionID string `json:"versionId"`
				Sequencer string `json:"sequencer"`
			} `json:"object"`
		} `json:"s3"`
	} `json:"Records"`
}

type EventHandler struct {
	// DefaultHandler provides auto confirmation of subscriptions and ignores
	// unsubscribe events.
	snshttp.DefaultHandler
}

// Notification is called for messages published to the SNS Topic. When using
// DefaultHandler as above this is the only event you need to implement.
func (h *EventHandler) Notification(ctx context.Context, event *snshttp.Notification) error {
	fmt.Printf("id=%q subject=%q message=%q timestamp=%q\n",
		event.MessageID,
		event.Subject,
		event.Message,
		event.Timestamp,
	)

	s3Notify := S3Notify{}

	if err := json.Unmarshal([]byte(event.Message), &s3Notify); err == nil {
		fmt.Printf("bucket=%q object=%q\n",
			s3Notify,
			"ob",
		)
		fmt.Printf("\nbucket=%q \n", s3Notify.Records[0].S3.Bucket.Name)
		fmt.Printf("\nobject=%q \n", s3Notify.Records[0].S3.Object.Key)

	} else {
		fmt.Printf("err=%q \n", err)
	}

	return nil
}

func getPublicIp() (string, error) {
	metaUrl := "http://169.254.169.254/latest/meta-data/public-ipv4"
	req, err := http.NewRequest("GET", metaUrl, nil)
	if err != nil {
		return "", err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	// Server is expected to return 200 OK but we can treat any 200 level code as
	// success.
	if !(200 <= resp.StatusCode && resp.StatusCode < 300) {
		return "", fmt.Errorf("server returned error status=%d", resp.StatusCode)
	}

	if resp.StatusCode == http.StatusOK {
		bodyBytes, _ := ioutil.ReadAll(resp.Body)
		bodyString := string(bodyBytes)
		return bodyString, nil
	}
	return "boo", nil
}
func snsSubscribe() {
	topicArn := flag.String("sns", "", "The ARN of the topic to which the user subscribes")

	flag.Parse()

	if *topicArn == "" {
		fmt.Println("You must supply a topic ARN")
		fmt.Println("Usage: go run SnsSubscribe.go -sns TOPIC-ARN")
		os.Exit(1)
	}

	// Initialize a session that the SDK will use to load
	// credentials from the shared credentials file. (~/.aws/credentials).
	sess := session.Must(session.NewSessionWithOptions(session.Options{
		SharedConfigState: session.SharedConfigEnable,
	}))

	svc := sns.New(sess)

	ip, _ := getPublicIp()
	fmt.Println("IP:", ip)
	notifyUrl := fmt.Sprintf("http://%s:8090/hooks/sns", ip)

	result, err := svc.Subscribe(&sns.SubscribeInput{
		Endpoint:              aws.String(notifyUrl),
		Protocol:              aws.String("http"),
		ReturnSubscriptionArn: aws.Bool(true), // Return the ARN, even if user has yet to confirm
		TopicArn:              topicArn,
	})
	if err != nil {
		fmt.Println(err.Error())
		os.Exit(1)
	}

	fmt.Println(*result.SubscriptionArn)
}

func main() {

	go snsSubscribe()
	// snshttp.New returns an http.Handler that will parse the payload and pass the
	// event to the provided EventHandler.
	snsHandler := snshttp.New(&EventHandler{},
		//snshttp.WithAuthentication("snsDerby", "password1Derby2"),
		snshttp.WithAuthentication("", ""),
	)

	http.Handle("/hooks/sns", snsHandler)
	http.ListenAndServe(":8090", nil)
}
