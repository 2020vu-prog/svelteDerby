#!/bin/bash

##echo "args2" "$@"

sshSoft=" -o GlobalKnownHostsFile=/dev/null -o UserKnownHostsFile=/dev/null -o  StrictHostKeyChecking=no "
sshAlive=" -o ServerAliveInterval=240 "
sshOpts=" $sshAlive $sshSoft "

function die {
        echo $@
        exit 99
}

function canProbe {
	type jq >/dev/null 2>&1  || die "Missing jq utility"
	type aws >/dev/null 2>&1 || die "Missing aws cli"
}
function applyArgs {
	sshTunnel1=""
	sshTunnel2=""
	## echo "applyArgs begin $@"

	for arg in "$@" 
	do
		echo "applyArgs checking arg $arg"
		[[ $arg == "--db" ]] &&  dbOptions 
		[[ $arg == "--reportingDb" ]] &&  reportingDbOptions
		[[ $arg == "--es" ]] &&  esOptions 
		[[ $arg == "--encryptEs" ]] && encryptEsOptions
		[[ $arg == "--mancenter" ]] &&  mancenterOptions
		[[ $arg == "--mancenterBash" ]] && PrivateIpAwsFilter=$PrivateIpMancenterFilter
		[[ $arg == "--jumpOnly" ]] && jumpOnly=true
		[[ $arg == "--verbose" ]] && verbose=true &&  set -x
	done
}
function mancenterOptions {
	export HzDnsName=hz-mancenter.vpczone.${TF_VAR_AcmKeyDomain}
	export RandomJumpHostPort=$(((RANDOM%1000)+32000))  ## 32000-32999 for mancenter

	#echo "WrkPort is $WrkPort" RandomJumpHostPort is $RandomJumpHostPort
	#echo "Beginning hzTunnel connect to $HzDnsName"

	[[ -z "$HzDnsName" ]] && die "missing  HzDnsName env"
	[[ -z "$WrkPort" ]] && export WrkPort=3399  ## default


	echo "using HzDnsName: $HzDnsName"
	echo "WrkPort is $WrkPort" RandomJumpHostPort is $RandomJumpHostPort
	echo "Beginning mancenter Tunnel connect"
        LocalListenHost=localhost
	newLine=$'\n'
	sshTunnel1=-L$WrkPort:$LocalListenHost:$RandomJumpHostPort 
	sshTunnel2=" -N -L$RandomJumpHostPort:$HzDnsName:8080 "
	sshTunnelMessage="${newLine}";
	sshTunnelMessage+="connect to to http://localhost:$WrkPort/hazelcast-mancenter${newLine}"
	sshTunnelMessage+="WrkPort is $WrkPort RandomJumpHostPort is $RandomJumpHostPort${newLine}"
}
function esOptions {
	KibanaDnsName=$( aws es describe-elasticsearch-domains --region "$AWS_DEFAULT_REGION" --domain-names ${TF_VAR_DeployEnvironment}-elastic-search|jq -r .DomainStatusList[].Endpoints.vpc)
	echo "esOptions: $KibanaDnsName"
	[[ -z "$KibanaDnsName" ]] && die "missing  KibanaDnsName env"
	[[ -z "$WrkPort" ]] && export WrkPort=7677  ## default

	export RandomJumpHostPort=$(((RANDOM%1000)+30000)) ## 30000-30999 for ES

	echo "using RDS: $KibanaDnsName"
	echo "WrkPort is $WrkPort" RandomJumpHostPort is $RandomJumpHostPort
	echo "Beginning esTunnel connect"
        LocalListenHost=localhost
	sshTunnel1=-L$WrkPort:$LocalListenHost:$RandomJumpHostPort 
	sshTunnel2=" -N -L$RandomJumpHostPort:$KibanaDnsName:443 "
	newLine=$'\n'
	sshTunnelMessage="";
	sshTunnelMessage+="WrkPort is $WrkPort RandomJumpHostPort is $RandomJumpHostPort${newLine}"
        sshTunnelMessage+="Tunneled url is https://$LocalListenHost:$WrkPort/_plugin/kibana${newLine}"
}
function encryptEsOptions {                                                                                                                                                                                                                
        KibanaDnsName=$( aws es describe-elasticsearch-domains --region "$AWS_DEFAULT_REGION" --domain-names ${TF_VAR_DeployEnvironment}-encrypted-es|jq -r .DomainStatusList[].Endpoints.vpc)                                    
        echo "esOptions: $KibanaDnsName"                                                                                                                                                                                            
        [[ -z "$KibanaDnsName" ]] && die "missing  KibanaDnsName env"                                                                                                                                                               
        [[ -z "$WrkPort" ]] && export WrkPort=7677  ## default                                                                                                                                                                      
                                                                                                                                                                                                                                    
        export RandomJumpHostPort=$(((RANDOM%1000)+30000)) ## 30000-30999 for ES                                                                                                                                                    
                                                                                                                                                                                                                                    
        echo "using RDS: $KibanaDnsName"                                                                                                                                                                                            
        echo "WrkPort is $WrkPort" RandomJumpHostPort is $RandomJumpHostPort                                                                                                                                                        
        echo "Beginning esTunnel connect"                                                                                                                                                                                           
        LocalListenHost=localhost                                                                                                                                                                                                   
        sshTunnel1=-L$WrkPort:$LocalListenHost:$RandomJumpHostPort                                                                                                                                                                  
        sshTunnel2=" -N -L$RandomJumpHostPort:$KibanaDnsName:443 "                                                                                                                                                                  
        newLine=$'\n'                                                                                                                                                                                                               
        sshTunnelMessage="";                                                                                                                                                                                                        
        sshTunnelMessage+="WrkPort is $WrkPort RandomJumpHostPort is $RandomJumpHostPort${newLine}"                                                                                                                                 
        sshTunnelMessage+="Tunneled url is https://$LocalListenHost:$WrkPort/_plugin/kibana${newLine}"                                                                                                                              
}
function dbOptions {
	RdsDnsName=$(aws rds describe-db-clusters --region "$AWS_DEFAULT_REGION" --db-cluster-identifier "switchboard-${TF_VAR_DeployEnvironment}"|jq -r .DBClusters[].Endpoint)
	echo "dbOptions: $RdsDnsName"
	[[ -z "$RdsDnsName" ]] && die "missing  RdsDnsName env"
	[[ -z "$WrkPort" ]] && export WrkPort=3333

	export RandomJumpHostPort=$(((RANDOM%1000)+31000))  ## 31000-31999 for db

	echo "using RDS: $RdsDnsName"
	echo "WrkPort is $WrkPort" RandomJumpHostPort is $RandomJumpHostPort
	echo "Beginning dbTunnel connect"
	sshTunnel1=-L$WrkPort:localhost:$RandomJumpHostPort 
	sshTunnel2="-N -L$RandomJumpHostPort:$RdsDnsName:3306 "

	newLine=$'\n'
	sshTunnelMessage="WrkPort is $WrkPort RandomJumpHostPort is $RandomJumpHostPort${newLine}"
}

function reportingDbOptions {
        RdsDnsName=$(aws rds describe-db-clusters --region "$AWS_DEFAULT_REGION" --db-cluster-identifier "switchboard-${TF_VAR_DeployEnvironment}-reporting"|jq -r .DBClusters[].Endpoint)  
        echo "dbOptions: $RdsDnsName"                                                                                                                                             
        [[ -z "$RdsDnsName" ]] && die "missing  RdsDnsName env"                                                                                                                   
        [[ -z "$WrkPort" ]] && export WrkPort=3333                                                                                                                                
                                                                                                                                                                                  
        export RandomJumpHostPort=$(((RANDOM%1000)+31000))  ## 31000-31999 for db                                                                                                 
                                                                                                                                                                                  
        echo "using RDS: $RdsDnsName"                                                                                                                                             
        echo "WrkPort is $WrkPort" RandomJumpHostPort is $RandomJumpHostPort                                                                                                      
        echo "Beginning dbTunnel connect"                                                                                                                                         
        sshTunnel1=-L$WrkPort:localhost:$RandomJumpHostPort                                                                                                                       
        sshTunnel2="-N -L$RandomJumpHostPort:$RdsDnsName:3306 "                                                                                                                   
                                                                                                                                                                                  
        newLine=$'\n'                                                                                                                                                             
        sshTunnelMessage="WrkPort is $WrkPort RandomJumpHostPort is $RandomJumpHostPort${newLine}" 
}

function authInstance {
	exec 99>&1 ## capture stdout as fh 99

	if [[ -n $verbose ]] 
	then
		echo verbose mode stdout to stderr >&2 
		exec 1>&2  ## default all stdout to stderr (so that the $() stdout capture works)
	else
		##echo quiet mode stdout to null >&2 
		exec 1>/dev/null
	fi
	

	InstanceFilterJson=$1
	IpTypePath=$2   ## .PublicIpAddress or .NetworkInterfaces[].PrivateIpAddress
	ec2JsonFile=$(mktemp)
	sshUser='ec2-user'
	canProbe
	
        aws ec2 describe-instances --filters "$InstanceFilterJson" > $ec2JsonFile 
	cp $ec2JsonFile  /tmp/ec2.json

	if [[ -n $OverrideIP ]] 
	then
		InstanceJson=$(cat $ec2JsonFile | jq ".Reservations[].Instances[] | select(.NetworkInterfaces[].PrivateIpAddress ==\"$OverrideIP\")" )
	else
		InstanceJson=$( cat $ec2JsonFile | jq  -r ".Reservations[].Instances[0]")
	fi
	

	IpAddress=$( echo $InstanceJson | jq  -r "${IpTypePath}" |head -1)
	InstanceId=$( echo $InstanceJson | jq  -r ".InstanceId" |head -1)
	AvailabilityZone=$( echo $InstanceJson | jq  -r ".Placement.AvailabilityZone" |head -1)
	[[ -z $IpAddress ]] && die " missing IpAddress"
	[[ -z $InstanceId ]] && die " missing InstanceId"
	[[ -z $AvailabilityZone ]] && die " missing AvailabilityZone"

	singleUseKey=$(mktemp)
	rm $singleUseKey
	ssh-keygen -t rsa -f "$singleUseKey" -N '' 

	aws ec2-instance-connect send-ssh-public-key --region "$AWS_DEFAULT_REGION" --instance-id "$InstanceId" --availability-zone "$AvailabilityZone" --instance-os-user "$sshUser" --ssh-public-key file://${singleUseKey}.pub 

	echo  TEST: ssh $sshSoft -v -i "$singleUseKey" "${sshUser}@${IpAddress}" 

	echo $IpAddress >&99

	echo ssh Agent PID: $SSH_AGENT_PID 
	echo ssh auth  for $IpAddress : $SSH_AUTH_SOCK 
	ssh-add $singleUseKey 



} 

function main {
	PrivateIpRunningFilter='[
	  {
	    "Name": "instance-state-name",
	    "Values": ["running"]
	  }
	]'
	PrivateIpMancenterFilter='[
	  {
	    "Name": "tag:CreatedBy",
	    "Values": ["terraform mancenter"]
	  },
	  {
	    "Name": "instance-state-name",
	    "Values": ["running"]
	  }
	]'
	PrivateIpAwsFilter='[
	  {
	    "Name": "tag:ComponentName",
	    "Values": ["VcrCloudEc2"]
	  },
	  {
	    "Name": "instance-state-name",
	    "Values": ["running"]
	  }
	]'

	JumpIpAwsFilter='[
	  {
	    "Name": "tag:Name",
	    "Values": ["discord-bot-asg"]
	  },
	  {
	    "Name": "instance-state-name",
	    "Values": ["running"]
	  }
	]'
	applyArgs "$@"


	OverrideIP=""
	[[ -n $JumpIP ]] && OverrideIP=$JumpIP
	JumpIP=$(authInstance "$JumpIpAwsFilter" .PublicIpAddress) 

	if [[ -z $JumpIP ]] 
	then 
		banner --newline "JumpIP not found." "Did jumphost self-destruct?"  "if so, restart it." "> cd adhoc/jumphost" "> tfinit" "> terraform apply"
		die "JumpIP not found."
	fi

	echo "Checking connectivity"
	nc "$JumpIP" 22 < /dev/null || die "Cannot connect to $JumpIP -- Verify dkg vpn tunnel? Wait for jumphost to finish booting?"
	echo "Connectivity ok"

	if [[ -n $jumpOnly ]]  ## login to jumphost only.  don't make second hop
	then
		ssh -g -A  -t   $sshTunnel1 $sshOpts ec2-user@$JumpIP 
	else
		OverrideIP=""
		PrivateActiveFilter=$PrivateIpAwsFilter

		[[ -n $PrivateIP ]] && OverrideIP=$PrivateIP
		[[ -n $PrivateIP ]] && PrivateActiveFilter=$PrivateIpRunningFilter  ## ignore tags when override ip specified.

		PrivateIP=$(authInstance "$PrivateActiveFilter" .NetworkInterfaces[].PrivateIpAddress) 
		[[ -n $PrivateIP ]] || die "PrivateIP not found"

		[[ -n $sshTunnelMessage ]] && echo "$sshTunnelMessage"
		ssh -g -A  -t   $sshTunnel1 $sshOpts ec2-user@$JumpIP "echo 'Logged into jumphost';ssh -A $sshTunnel2 $sshOpts ec2-user@$PrivateIP"
	fi



}
main $@
