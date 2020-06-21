use strict;
my $prev;
while(<>){

	chomp;
	if($prev){
		my $delta=$_ - $prev;
		#print $delta," $_ \n";
		my $deltaMS=int($delta/1);
		print $deltaMS,"  \n";
	}

	$prev=$_;
}
