import React, { useState,useRef, useEffect, useCallback } from "react";
import { SafeAreaView, TouchableOpacity, View,Text,Image } from "react-native";
import BottomSheet from "react-native-gesture-bottom-sheet";
import styles from "./style";

const ExitBottomSheet = (props) => {
  const [showBtn, setShowBtn] = useState(false);
  const [requestActive, setRequestActive] = useState(false)
  const [option, setOption] = useState("")
  const bottomSheet = useRef();


  return (
    <SafeAreaView style={styles.container}>
      <BottomSheet  ref={props.bottomSheet} height={220} radius={1} sheetBackgroundColor="#F2F4F7"  hasDraggableIcon={true} >
     
   <View style={styles.bgTitleCover}>
      <Text style={styles.bgTitleText}>Exit Acia Master Note</Text>
    </View>
    <View style={styles.welcomeCover}>
      
        <Text style={styles.smText}>Do you want to exit from the application</Text>
    </View>
   

  

  
 
    <View style={styles.btnCover}>
      <TouchableOpacity style={styles.exitBtn} onPress={props.yes}>
        <Text style={styles.exitText}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.exitBtn} onPress={props.no}>
        <Text style={styles.exitText}>No</Text>
      </TouchableOpacity>
    </View>

      
     </BottomSheet>
    </SafeAreaView>
  );
};



export default ExitBottomSheet;