#!/bin/bash
echo hi
exec > /tmp/on_boot.out 2>&1
sudo yum install -y  ec2-instance-connect > /tmp/yum_install.out 2>&1


function selfDestructWhenIdle () {

        ## shutdown instance automatically to mitigate risk of ssh listener on public ip
        ##   (it is already filtered to restrict access)
        ##   this leverages instance setting of:  instance-initiated-shutdown-behavior =terminate
        ##echo "shutdown -h now" | at now + 55 minutes > /tmp/selfDestruct.out 2>&1

        shutScript=/tmp/potentialShutdown.sh
        cat <<- 'SD_EOF' > "$shutScript"
		#!/bin/bash
		function terminateAsg () {
			export AWS_DEFAULT_REGION=us-east-2
			asg=$(aws autoscaling describe-auto-scaling-instances --output text --query=AutoScalingInstances[].AutoScalingGroupName --instance-ids=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)|grep discord)
			if [[ -n "$asg" ]]
			then
				echo dial down $asg
				aws autoscaling set-desired-capacity \
			    --auto-scaling-group-name "$asg" \
			    --desired-capacity 0 \
			    --no-honor-cooldown
			else
				echo cannot find $asg
			fi
		}

		if go version
		then
			echo dev. will persist.
			exit 0
		fi

		#if test $(find "/var/log/wtmp" -mmin +1200)
		if test  $(find "/tmp/sns.out" -mmin +240)
		then
			echo tired.  eligible to quit
			terminateAsg 
		        /sbin/shutdown -h now
		else
			echo stick around
		fi
	SD_EOF
        chmod +x $shutScript

	(crontab -l ; echo "* * * * * $shutScript > /tmp/shutScript.out 2>&1")| crontab -

}



function fastSsh(){
	echo "UseDNS no" >> /etc/ssh/sshd_config
	service sshd restart
}

function runBot(){
	chmod +x $s3dir/airhorn/airhorn
	token=$(aws ssm get-parameters --region us-east-2  --names discord-bot-token|jq -r '.Parameters[0].Value')

	while true
	do
		cd $s3dir/airhorn
		./airhorn -t "$token" 2>&1 |tee -a /tmp/bot.out
		sleep 18
	done
}

function runSns(){
	chmod +x $s3dir/sns/cjwsns $s3dir/sns/*.sh

	while true
	do
		cd $s3dir/sns
		./sns.sh 2>&1 |tee -a /tmp/sns.out
		sleep 19
	done
}
function initBot () {
	yum install -y jq
	export s3dir="/s3"
	mkdir $s3dir
	bucket=$(aws ssm get-parameters --region us-east-2  --names discord-bot-boot-bucket|jq -r '.Parameters[0].Value')

	echo bucket: $bucket
	aws s3 sync s3://$bucket "$s3dir"
	chown -R ec2-user $s3dir
	runBot &
	runSns &
}

fastSsh &
initBot &
selfDestructWhenIdle &
